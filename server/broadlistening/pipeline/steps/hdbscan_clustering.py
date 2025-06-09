import json
import os

import nltk
import numpy as np
import pandas as pd
import stopwordsiso as sw
from bertopic import BERTopic
from hdbscan import HDBSCAN
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

nltk.download("stopwords")


# ✅ Janomeベースの日本語トークナイザー
def japanese_tokenizer(text):
    t = Tokenizer()
    tokens = [
        token.base_form
        for token in t.tokenize(text)
        if token.part_of_speech.split(",")[0] in ["名詞", "動詞", "形容詞"]
    ]
    return tokens


def run_clustering():
    # 📂 入力・出力パス設定
    DATA_DIR = r"D:\myproject\kouchou-ai\server\broadlistening\pipeline\outputs\52c5472d-ad28-4d2b-b420-aa30e50dadbe"
    ARGS_PATH = os.path.join(DATA_DIR, "args.csv")
    EMBEDDINGS_PATH = os.path.join(DATA_DIR, "embeddings.pkl")
    OUTPUT_PATH = os.path.join(DATA_DIR, "bertopic_result.csv")
    TREE_OUTPUT_PATH = os.path.join(DATA_DIR, "hdbscan_condensed_tree.csv")
    LINKAGE_PATH = os.path.join(DATA_DIR, "hdbscan_linkage_matrix.npy")

    # 📄 データ読み込み
    args_df = pd.read_csv(ARGS_PATH)
    embeddings_df = pd.read_pickle(EMBEDDINGS_PATH)
    merged_df = pd.merge(args_df, embeddings_df, on="arg-id", how="inner")

    documents = merged_df["argument"].tolist()
    embeddings = np.vstack(merged_df["embedding"].values)

    # 🔹 クラスタリング用にUMAPで50次元へ次元削減
    umap_model_50d = UMAP(n_components=50, random_state=42)
    embeddings_50d = umap_model_50d.fit_transform(embeddings)

    # 🔸 可視化用にUMAPで2次元へ圧縮
    umap_model_2d = UMAP(n_components=2, random_state=42)
    coords_2d = umap_model_2d.fit_transform(embeddings)

    # 🌲 HDBSCANクラスタリング（BERTopicに渡す用）
    hdbscan_model = HDBSCAN(min_cluster_size=3, min_samples=1, prediction_data=True)

    # 🛑 ストップワード（stopwords-iso + カスタム）
    stopwords = list(set(sw.stopwords("ja")) | {"こう", "よく", "とる"})

    # 🔠 CountVectorizer（日本語トークン＆ストップワード）
    vectorizer_model = CountVectorizer(
        tokenizer=japanese_tokenizer,
        stop_words=stopwords,
    )

    # 🧠 BERTopic：クラスタリングと可視化用モデルの両方を渡す
    topic_model = BERTopic(
        language="japanese",
        hdbscan_model=hdbscan_model,
        umap_model=umap_model_2d,  # ← 可視化用
        vectorizer_model=vectorizer_model,
        calculate_probabilities=False,
        verbose=False,
    )

    # 🧩 トピック抽出（ここでHDBSCANも内部で使われる）
    topics, _ = topic_model.fit_transform(documents, embeddings_50d)
    topic_reprs = topic_model.get_topics()
    labels = topic_model.get_document_info(documents)["Topic"]
    probabilities = topic_model.hdbscan_model.probabilities_

    # トピック代表語を抽出
    topic_words = [
        ", ".join([word for word, _ in topic_reprs.get(topic, [])]) if topic in topic_reprs else "" for topic in topics
    ]

    # 💾 結果保存
    result_df = pd.DataFrame(
        {
            "arg-id": merged_df["arg-id"],
            "argument": documents,
            "x": coords_2d[:, 0],
            "y": coords_2d[:, 1],
            "hdbscan-cluster-id": labels,
            "probability": probabilities,  # ← 追加
            "topic-representative-words": topic_words,
        }
    )
    result_df.to_csv(OUTPUT_PATH, index=False)

    # 🌟 cluster_labels.json を生成
    LABEL_JSON_PATH = os.path.join(DATA_DIR, "cluster_labels.json")
    cluster_labels = {}
    for topic_id, words in topic_reprs.items():
        if not words:
            continue
        representative = words[0][0]
        keywords = [w for w, _ in words]
        cluster_labels[str(topic_id)] = {
            "representative": representative,
            "keywords": keywords,
        }
    with open(LABEL_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(cluster_labels, f, ensure_ascii=False, indent=2)

    # condensed tree / linkage 出力
    hdbscan_fitted = topic_model.hdbscan_model
    hdbscan_fitted.condensed_tree_.to_pandas().to_csv(TREE_OUTPUT_PATH, index=False)
    np.save(LINKAGE_PATH, hdbscan_fitted.single_linkage_tree_.to_numpy())

    return result_df.head()


if __name__ == "__main__":
    preview = run_clustering()
    print("✅ clustering preview:")
    print(preview)
