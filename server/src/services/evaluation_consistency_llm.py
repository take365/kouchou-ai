import argparse
import json
import os
import random
import pandas as pd
from typing import List

from broadlistening.pipeline.services.llm import request_to_chat_openai


CRITERIA_PROMPT_HEADER = """以下の４指標について、各クラスタを 1〜5 点で評価します。スコアは下記の基準に沿って判断してください。

Clarity（明確さ）
1点: 何を伝えたいのかほとんどわからない。主語・述語があいまいで、意図が不明。
2点: 主旨は掴めるが曖昧な表現や冗長さがあり、推測が必要。
3点: おおむね意図は明確だが、情報の過不足や表現のぶれがある。
4点: 軽微な曖昧さのみで、ほとんどの箇所で明確に伝わる。
5点: 一読で完全に意図が伝わり、誤解の余地がない。

Coherence（一貫性）
1点: 論理のつながりが乏しく、要素がバラバラに並んでいる。
2点: 流れはあるが、話題転換や論理の飛躍が目立つ。
3点: 概ねつながっているが、一部あいまいな点や接続不足がある。
4点: 自然な流れで展開されており、小さな接続不足のみ。
5点: 論理的で一貫性があり、構成が明確。

Consistency（意見の整合度）
1点: 意見間に矛盾があり、結論が前提と一致していない。
2点: 主な点で論理的な齟齬がある。
3点: 基本的に矛盾はないが、不自然な点もある。
4点: 前提→論証→結論が概ね整っている。
5点: 論理的に完結しており、整合性が高い。

Distinctiveness（他クラスタとの差異）
1点: 内容が他クラスタと大きく重複している。
2点: 一部独自要素はあるが、判別しにくい。
3点: 主要テーマは独自だが、細部に重複がある。
4点: 独自性が高く、他と区別しやすい。
5点: 完全に独自のテーマであり、明確に区別できる。

また、各クラスタには簡潔なコメント（comment）も必ず記述してください。
スコアの根拠や気づいた改善点・特徴などを1〜2文でわかりやすくまとめてください。

出力形式は必ず JSON 形式でお願いします。以下は例です：
{
  "1_1": {
    "clarity": 4,
    "coherence": 5,
    "consistency": 4,
    "distinctiveness": 3,
    "comment": "説明は適切だが、他のクラスタと少し似ている。"
  },
  "1_2": {
    "clarity": 3,
    "coherence": 4,
    "consistency": 3,
    "distinctiveness": 2,
    "comment": "意見と説明は整合しているが、一部焦点がぶれる箇所がある。"
  }
}

以下のクラスタに対して評価をお願いします：
"""

def load_cluster_data(dataset: str, level: int, sampling_rate: float) -> dict:
    args_path = f"broadlistening/pipeline/outputs/{dataset}/args.csv"
    labels_path = f"broadlistening/pipeline/outputs/{dataset}/hierarchical_merge_labels.csv"
    clusters_path = f"broadlistening/pipeline/outputs/{dataset}/hierarchical_clusters.csv"

    args_df = pd.read_csv(args_path)
    labels_df = pd.read_csv(labels_path)
    clusters_df = pd.read_csv(clusters_path)

    cluster_col = f"cluster-level-{level}-id"
    cluster_data = {}

    for _, row in labels_df[labels_df["level"] == level].iterrows():
        cluster_id = row["id"]
        label = row["label"]
        description = row["description"]
        cluster_args = clusters_df[clusters_df[cluster_col] == cluster_id]
        arg_texts = cluster_args["argument"].tolist()

        if sampling_rate < 1.0:
            sample_size = max(1, int(len(arg_texts) * sampling_rate))
            arg_texts = random.sample(arg_texts, sample_size)

        cluster_data[cluster_id] = {
            "label": label,
            "description": description,
            "arguments": arg_texts,
        }

    return cluster_data

def format_batch_prompt(cluster_data: dict) -> str:
    prompt = CRITERIA_PROMPT_HEADER
    for cluster_id, data in cluster_data.items():
        prompt += "\n" + "=" * 30 + f"\n【クラスタID】{cluster_id}\n"
        prompt += f"【ラベル】{data['label']}\n"
        prompt += f"【説明】\n{data['description']}\n"
        prompt += "【意見】\n"
        for arg in data["arguments"]:
            prompt += f"- {arg}\n"
    return prompt

def evaluate_clusters(cluster_data: dict, mode: str, model: str) -> dict:
    if mode == "print":
        prompt = format_batch_prompt(cluster_data)
        print("\n" + "="*40 + f"\nバッチ評価用プロンプト:\n" + "="*40)
        print(prompt)
        return {}

    results = {}
    for cluster_id, data in cluster_data.items():
        prompt = CRITERIA_PROMPT_HEADER
        prompt += "\n" + "=" * 30 + f"\n【クラスタID】{cluster_id}\n"
        prompt += f"【ラベル】{data['label']}\n"
        prompt += f"【説明】{data['description']}\n"
        prompt += "【意見】\n"
        for arg in data["arguments"]:
            prompt += f"- {arg}\n"

        messages = [
            {"role": "system", "content": "あなたは評価者です。"},
            {"role": "user", "content": prompt}
        ]
        try:
            response = request_to_chat_openai(messages=messages, model=model, is_json=True)
            results[cluster_id] = json.loads(response)
            results[cluster_id]["label"] = data["label"]
        except Exception as e:
            print(f"Error evaluating cluster {cluster_id}: {e}")
    return results

def save_results(results: dict, dataset: str):
    output_path = f"broadlistening/pipeline/outputs/{dataset}/evaluation_consistency_llm.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"結果を保存しました: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="クラスタ整合性評価（LLM使用）")
    parser.add_argument("--dataset", required=True, help="データセット名")
    parser.add_argument("--level", type=int, default=1, help="評価対象とするクラスタ階層レベル")
    parser.add_argument("--sampling-rate", type=float, default=1.0, help="クラスタ内意見のサンプリング割合 (0.0〜1.0)")
    parser.add_argument("--mode", choices=["api", "print"], default="api", help="API実行かプロンプト出力か")
    parser.add_argument("--model", default="gpt-4o-mini", help="使用するOpenAIモデル")
    args = parser.parse_args()

    cluster_data = load_cluster_data(args.dataset, args.level, args.sampling_rate)
    results = evaluate_clusters(cluster_data, args.mode, args.model)
    if args.mode == "api":
        save_results(results, args.dataset)

if __name__ == "__main__":
    main()
