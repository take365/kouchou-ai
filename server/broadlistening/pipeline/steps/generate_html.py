import json
import os

import pandas as pd
import plotly.express as px

# 🔧 パスの設定
DATA_DIR = r"D:\myproject\kouchou-ai\server\broadlistening\pipeline\outputs\52c5472d-ad28-4d2b-b420-aa30e50dadbe"
RESULT_CSV = os.path.join(DATA_DIR, "bertopic_result.csv")
LABEL_JSON = os.path.join(DATA_DIR, "cluster_labels.json")
HTML_OUT = os.path.join(DATA_DIR, "cluster_overview.html")

# 📄 データ読み込み
result_df = pd.read_csv(RESULT_CSV)
with open(LABEL_JSON, encoding="utf-8") as f:
    label_dict = json.load(f)

# 🛠 確信度列がなければ仮で100%に設定
if "probability" not in result_df.columns:
    result_df["probability"] = 1.0

# 💡 クラスタID列
result_df["cluster_id"] = result_df["hdbscan-cluster-id"]
result_df["cluster_str"] = result_df["cluster_id"].astype(str)

# 📊 クラスタ要約情報の抽出
cluster_summary = []
grouped = result_df.groupby("cluster_str")
for cluster_id, group in grouped:
    cluster_info = {
        "cluster_id": cluster_id,
        "size": len(group),
        "keywords": group["topic-representative-words"].iloc[0]
        if "topic-representative-words" in group.columns
        else "",
        "representative": label_dict.get(cluster_id, {}).get(
            "representative", group.loc[group["probability"].idxmax()]["argument"]
        ),
    }
    if cluster_id == "-1":
        cluster_info["representative"] = "その他少数意見"
        cluster_info["keywords"] = ""
    cluster_summary.append(cluster_info)

# 📋 クラスタ概要テーブルHTML
cluster_table_html = (
    "<table border='1'><tr><th>クラスタID</th><th>代表語</th><th>件数</th><th>簡易ラベル（キーワード）</th></tr>"
)
for c in cluster_summary:
    cluster_table_html += (
        f"<tr><td>{c['cluster_id']}</td><td>{c['representative']}</td><td>{c['size']}</td><td>{c['keywords']}</td></tr>"
    )
cluster_table_html += "</table>"

# 🌐 散布図を生成（plotly）
scatter_fig = px.scatter(
    result_df,
    x="x",
    y="y",
    color="cluster_str",
    hover_data=["arg-id", "argument", "probability"],
    title="UMAP + HDBSCAN クラスタリング散布図",
    width=1800,
    height=1000,
)
scatter_html = scatter_fig.to_html(full_html=False, include_plotlyjs="cdn")

# 📝 各クラスタの本文一覧（確信度順）＋ クラスタ情報付きヘッダ
cluster_detail_html = ""
for c in cluster_summary:
    cluster_id = c["cluster_id"]
    representative = c["representative"]
    size = c["size"]
    keywords = c["keywords"]

    cluster_detail_html += (
        f"<h3>クラスタ {cluster_id} | 代表語: {representative} | 件数: {size} | キーワード: {keywords}</h3><ul>"
    )

    group = grouped.get_group(str(cluster_id))
    group_sorted = group.sort_values(by="probability", ascending=False)

    for _, row in group_sorted.iterrows():
        score = f"{int(row['probability'] * 100)}%" if row["cluster_id"] != -1 else "--"
        cluster_detail_html += f"<li>[{score}] {row['argument']}</li>"
    cluster_detail_html += "</ul>"

# 📄 HTMLヘッダー＋CSS（吹き出しの切れ防止用）
html_header = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>クラスタ概要</title>
    <style>
        body {
            max-width: none;
            margin: 40px;
            font-family: sans-serif;
        }
        .hoverlayer .hovertext text {
            white-space: pre-wrap !important;
            overflow-wrap: break-word !important;
            max-width: 600px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        td, th {
            padding: 6px 10px;
        }
        ul {
            padding-left: 1em;
        }
    </style>
</head>
<body>
"""

# 📄 全体HTML組み立て
full_html = f"""
{html_header}
    <h1>クラスタ概要（表形式）</h1>
    {cluster_table_html}

    <h2>クラスタ散布図</h2>
    {scatter_html}

    <h2>クラスタごとの意見一覧</h2>
    {cluster_detail_html}
</body>
</html>
"""

# 💾 HTML保存
with open(HTML_OUT, "w", encoding="utf-8") as f:
    f.write(full_html)

print("✅ クラスタ概要HTMLを生成しました:", HTML_OUT)
