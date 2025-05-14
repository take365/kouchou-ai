"""Cluster the arguments using UMAP + HDBSCAN and GPT-4."""

import math
from importlib import import_module

import numpy as np
import pandas as pd
import scipy.cluster.hierarchy as sch
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def get_cluster_ranges(n_comments):
    lv1 = max(2, min(10, round(n_comments ** (1 / 3))))
    lv2 = max(2, min(1000, round(lv1 * lv1)))
    upper_range = range(2, max(2, lv2 - 1))
    lower_range = range(max(2, lv2 - 1), lv2 * 2 + 1)
    return upper_range, lower_range

def best_k_by_silhouette(embeds, k_range, level_name=""):
    print(f"🔍 {level_name}クラスタ数の候補: {list(k_range)}")
    best_score = -1
    best_k = k_range.start
    for k in k_range:
        if k >= len(embeds):
            print(f"⚠️ k={k} はサンプル数 {len(embeds)} 以上のためスキップ")
            continue
        try:
            labels = KMeans(n_clusters=k, random_state=42).fit_predict(embeds)
            score = silhouette_score(embeds, labels)
            #print(f"🔸 k={k}, silhouette={score:.4f}")
            if score > best_score:
                best_score = score
                best_k = k
        except Exception as e:
            print(f"⚠️ k={k} でエラー: {e}")
            continue
    print(f"✅ {level_name}の最適クラスタ数: {best_k}（スコア: {best_score:.4f}）")
    return best_k

def hierarchical_clustering(config):
    UMAP = import_module("umap").UMAP

    dataset = config["output_dir"]
    path = f"outputs/{dataset}/hierarchical_clusters.csv"
    arguments_df = pd.read_csv(f"outputs/{dataset}/args.csv", usecols=["arg-id", "argument"])
    embeddings_df = pd.read_pickle(f"outputs/{dataset}/embeddings.pkl")
    embeddings_array = np.asarray(embeddings_df["embedding"].values.tolist())

    n_samples = embeddings_array.shape[0]

    # デフォルト設定は15
    default_n_neighbors = 15

    # テスト等サンプルが少なすぎる場合、n_neighborsの設定値を下げる
    if n_samples <= default_n_neighbors:
        n_neighbors = max(2, n_samples - 1)  # 最低2以上
    else:
        n_neighbors = default_n_neighbors

    umap_model = UMAP(random_state=42, n_components=2, n_neighbors=n_neighbors)
    # TODO 詳細エラーメッセージを加える
    # 以下のエラーの場合、おそらく元の意見件数が少なすぎることが原因
    # TypeError: Cannot use scipy.linalg.eigh for sparse A with k >= N. Use scipy.linalg.eigh(A.toarray()) or reduce k.
    umap_embeds = umap_model.fit_transform(embeddings_array)

    auto_cluster = config.get("auto_cluster", False)
    if auto_cluster or "cluster_nums" not in config["hierarchical_clustering"]:
        print("🧠 クラスタ数を自動決定します（UMAP後の Silhouette スコアで最良値を選択）")
        upper_range, lower_range = get_cluster_ranges(n_samples)
        best_lv1 = best_k_by_silhouette(umap_embeds, upper_range, level_name="上層（Lv1）")
        best_lv2 = best_k_by_silhouette(umap_embeds, lower_range, level_name="下層（Lv2）")
        config["hierarchical_clustering"]["cluster_nums"] = [best_lv1, best_lv2]
        print(f"✅ 決定されたクラスタ数: lv1 = {best_lv1}, lv2 = {best_lv2}")

    cluster_nums = config["hierarchical_clustering"]["cluster_nums"]

    cluster_results = hierarchical_clustering_embeddings(
        umap_embeds=umap_embeds,
        cluster_nums=cluster_nums,
    )
    result_df = pd.DataFrame(
        {
            "arg-id": arguments_df["arg-id"],
            "argument": arguments_df["argument"],
            "x": umap_embeds[:, 0],
            "y": umap_embeds[:, 1],
        }
    )

    for cluster_level, final_labels in enumerate(cluster_results.values(), start=1):
        result_df[f"cluster-level-{cluster_level}-id"] = [f"{cluster_level}_{label}" for label in final_labels]

    result_df.to_csv(path, index=False)


def generate_cluster_count_list(min_clusters: int, max_clusters: int):
    cluster_counts = []
    current = min_clusters
    cluster_counts.append(current)

    if min_clusters == max_clusters:
        return cluster_counts

    while True:
        next_double = current * 2
        next_triple = current * 3

        if next_double >= max_clusters:
            if cluster_counts[-1] != max_clusters:
                cluster_counts.append(max_clusters)
            break

        # 次の倍はまだ max_clusters に収まるが、3倍だと超える
        # -> (次の倍は細かすぎるので)スキップして max_clusters に飛ぶ
        if next_triple > max_clusters:
            cluster_counts.append(max_clusters)
            break

        cluster_counts.append(next_double)
        current = next_double

    return cluster_counts


def merge_clusters_with_hierarchy(
    cluster_centers: np.ndarray,
    kmeans_labels: np.ndarray,
    umap_array: np.ndarray,
    n_cluster_cut: int,
):
    Z = sch.linkage(cluster_centers, method="ward")
    cluster_labels_merged = sch.fcluster(Z, t=n_cluster_cut, criterion="maxclust")

    n_samples = umap_array.shape[0]
    final_labels = np.zeros(n_samples, dtype=int)

    for i in range(n_samples):
        original_label = kmeans_labels[i]
        final_labels[i] = cluster_labels_merged[original_label]

    return final_labels


def hierarchical_clustering_embeddings(
    umap_embeds,
    cluster_nums,
):
    # 最大分割数でクラスタリングを実施
    print("start initial clustering")
    initial_cluster_num = cluster_nums[-1]
    kmeans_model = KMeans(n_clusters=initial_cluster_num, random_state=42)
    kmeans_model.fit(umap_embeds)
    print("end initial clustering")

    results = {}
    print("start hierarchical clustering")
    cluster_nums.sort()
    print(cluster_nums)
    for n_cluster_cut in cluster_nums[:-1]:
        print("n_cluster_cut: ", n_cluster_cut)
        final_labels = merge_clusters_with_hierarchy(
            cluster_centers=kmeans_model.cluster_centers_,
            kmeans_labels=kmeans_model.labels_,
            umap_array=umap_embeds,
            n_cluster_cut=n_cluster_cut,
        )
        results[n_cluster_cut] = final_labels

    results[initial_cluster_num] = kmeans_model.labels_
    print("end hierarchical clustering")

    return results
