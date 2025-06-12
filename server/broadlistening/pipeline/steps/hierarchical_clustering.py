import logging
import time
from datetime import datetime
from importlib import import_module

import numpy as np
import pandas as pd
import scipy.cluster.hierarchy as sch
from hierarchical_utils import update_status
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

logging.getLogger("numba").setLevel(logging.WARNING)


def hierarchical_clustering(config):
    UMAP = import_module("umap").UMAP

    dataset = config["output_dir"]
    path = f"outputs/{dataset}/hierarchical_clusters.csv"
    arguments_df = pd.read_csv(f"outputs/{dataset}/args.csv", usecols=["arg-id", "argument"])
    embeddings_df = pd.read_pickle(f"outputs/{dataset}/embeddings.pkl")
    embeddings_array = np.asarray(embeddings_df["embedding"].values.tolist())

    n_samples = embeddings_array.shape[0]
    default_n_neighbors = 15
    # テスト等サンプルが少なすぎる場合、n_neighborsの設定値を下げる
    if n_samples <= default_n_neighbors:
        n_neighbors = max(2, n_samples - 1)
    else:
        n_neighbors = default_n_neighbors

    umap_model = UMAP(random_state=42, n_components=2, n_neighbors=n_neighbors)
    # TODO 詳細エラーメッセージを加える
    # 以下のエラーの場合、おそらく元の意見件数が少なすぎることが原因
    # TypeError: Cannot use scipy.linalg.eigh for sparse A with k >= N. Use scipy.linalg.eigh(A.toarray()) or reduce k.

    umap_embeds = umap_model.fit_transform(embeddings_array)
    # ✅ 自動クラスタ設定の場合
    clustering_config = config.get("hierarchical_clustering", {})
    if clustering_config.get("auto_cluster_enabled", False):
        lv1_min = clustering_config.get("cluster_lv1_min", 2)
        lv1_max = clustering_config.get("cluster_lv1_max", 20)
        lv2_min = clustering_config.get("cluster_lv2_min", lv1_max + 1)
        lv2_max = clustering_config.get("cluster_lv2_max", 100)

        n_samples = umap_embeds.shape[0]
        max_clusters = max(2, n_samples - 1)

        # 上限補正
        lv1_max = min(lv1_max, max_clusters)
        lv2_max = min(lv2_max, max_clusters)

        # 下限補正
        lv1_min = max(2, min(lv1_min, lv1_max))
        lv2_min = max(lv1_max + 1, min(lv2_min, lv2_max))

        silhouette_results = []
        best_lv1_score, best_lv1 = -1, None
        best_lv2_score, best_lv2 = -1, None

        start = time.time()

        for k in range(lv1_min, lv1_max + 1):
            try:
                labels = KMeans(n_clusters=k, random_state=42).fit_predict(umap_embeds)
                score = silhouette_score(umap_embeds, labels)
                silhouette_results.append((f"lv1-{k}", score))
                if score > best_lv1_score:
                    best_lv1_score, best_lv1 = score, k
            except ValueError as e:
                print(f"[auto-cluster] silhouette_score error for lv1-{k}: {e}")

        for k in range(lv2_min, lv2_max + 1):
            try:
                labels = KMeans(n_clusters=k, random_state=42).fit_predict(umap_embeds)
                score = silhouette_score(umap_embeds, labels)
                silhouette_results.append((f"lv2-{k}", score))
                if score > best_lv2_score:
                    best_lv2_score, best_lv2 = score, k
            except ValueError as e:
                print(f"[auto-cluster] silhouette_score error for lv2-{k}: {e}")

        duration_sec = round(time.time() - start, 2)

        structured_result = {
            "timestamp": datetime.now().isoformat(),
            "lv1_range": [int(lv1_min), int(lv1_max)],
            "lv2_range": [int(lv2_min), int(lv2_max)],
            "best": {
                "lv1": {"k": int(best_lv1), "score": float(round(best_lv1_score, 6))},
                "lv2": {"k": int(best_lv2), "score": float(round(best_lv2_score, 6))},
            },
            "duration_sec": float(duration_sec),
            "results": [{"label": label, "score": float(round(score, 6))} for label, score in silhouette_results],
        }

        # 人間向けの .txt 出力も維持
        lines = ["🔎 クラスタリング評価結果 (Silhouette Score)"]
        for r in structured_result["results"]:
            lines.append(f"{r['label']:>10}: {r['score']:.6f}")
        lines.append("\n✅ 最適クラスタ数:")
        lines.append(f" - best_lv1: {best_lv1} (score={best_lv1_score:.6f})")
        lines.append(f" - best_lv2: {best_lv2} (score={best_lv2_score:.6f})")
        with open(f"outputs/{dataset}/auto_cluster_result.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        # ✅ 保存
        clustering_config["auto_cluster_result"] = structured_result
        cluster_nums = [best_lv1, best_lv2]
        clustering_config["cluster_nums"] = cluster_nums

        update_status(config, {})
    else:
        # 通常モード
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
