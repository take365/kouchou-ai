import argparse
import json
import os
import pandas as pd
import numpy as np
from sklearn.metrics import silhouette_samples, silhouette_score
from typing import Literal


def load_vectors(dataset: str, source: Literal["embedding", "umap"]):
    if source == "embedding":
        df = pd.read_pickle(f"broadlistening/pipeline/outputs/{dataset}/embeddings.pkl")
        vectors = np.vstack(df["embedding"].values)
        arg_ids = df["arg-id"].tolist()
    elif source == "umap":
        df = pd.read_csv(f"broadlistening/pipeline/outputs/{dataset}/hierarchical_clusters.csv")
        vectors = df[["x", "y"]].values
        arg_ids = df["arg-id"].tolist()
    else:
        raise ValueError("Invalid source")
    return vectors, arg_ids


def load_cluster_labels(dataset: str, level: int):
    df = pd.read_csv(f"broadlistening/pipeline/outputs/{dataset}/hierarchical_clusters.csv")
    cluster_col = f"cluster-level-{level}-id"
    return df[["arg-id", cluster_col]].rename(columns={cluster_col: "cluster_id"})


def compute_silhouette(dataset: str, level: int, source: Literal["embedding", "umap"]):
    vectors, arg_ids = load_vectors(dataset, source)
    cluster_df = load_cluster_labels(dataset, level)

    df = pd.DataFrame({"arg-id": arg_ids})
    df = df.merge(cluster_df, on="arg-id", how="left")

    labels = df["cluster_id"].values
    unique_labels = np.unique(labels)
    if len(unique_labels) < 2:
        print(f"クラスタ数が2未満のため、{source}ベクトルでは評価をスキップします。")
        return None, None

    score_all = silhouette_samples(vectors, labels, metric="euclidean")
    df["score"] = score_all

    per_cluster_scores = df.groupby("cluster_id")["score"].mean().to_dict()
    per_point_scores = df.set_index("arg-id")["score"].to_dict()
    overall = silhouette_score(vectors, labels, metric="euclidean")

    return per_cluster_scores, per_point_scores, overall


def save_json(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="シルエットスコアによるクラスタ構造の内部評価")
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--level", type=int, default=1)
    parser.add_argument("--source", choices=["embedding", "umap", "both"], default="both")
    args = parser.parse_args()

    sources = [args.source] if args.source != "both" else ["embedding", "umap"]

    for source in sources:
        print(f"\n=== 評価ソース: {source} ===")
        cluster_scores, point_scores, overall = compute_silhouette(args.dataset, args.level, source)

        if cluster_scores is None:
            print("スキップされました。")
            continue

        base = f"broadlistening/pipeline/outputs/{args.dataset}/silhouette_{source}_level{args.level}"
        save_json({
            "level": args.level,
            "source": source,
            "clusters": cluster_scores,
            "overall_avg": overall
        }, base + "_clusters.json")

        save_json(point_scores, base + "_points.json")

        print(f"✓ 出力完了: {base}_clusters.json, {base}_points.json")


if __name__ == "__main__":
    main()
