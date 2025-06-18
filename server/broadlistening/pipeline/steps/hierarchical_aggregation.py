"""Generate a convenient JSON output file."""

import json
from collections import defaultdict
from pathlib import Path
from typing import Any, TypedDict

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).parent.parent.parent.parent
CONFIG_DIR = ROOT_DIR / "scatter" / "pipeline" / "configs"
PIPELINE_DIR = ROOT_DIR / "broadlistening" / "pipeline"


def json_serialize_numpy(obj: Any) -> Any:
    """
    Recursively convert NumPy data types to native Python types for JSON serialization.

    Args:
        obj: Any Python object which might contain NumPy data types

    Returns:
        The same object structure with NumPy types converted to Python native types
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: json_serialize_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [json_serialize_numpy(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(json_serialize_numpy(item) for item in obj)
    else:
        return obj


class Cluster(TypedDict):
    level: int
    id: str
    label: str
    takeaway: str
    value: int
    parent: str
    density_rank_percentile: int | float | None


class Argument(TypedDict):
    arg_id: str
    argument: str
    original_comment: str
    summary: str
    comment_id: str
    x: float
    y: float
    p: float
    cluster_ids: list[str]
    attributes: dict[str, str] | None
    url: str | None


def hierarchical_aggregation(config) -> bool:
    path = f"outputs/{config['output_dir']}/hierarchical_result.json"
    results = {
        "arguments": [],
        "clusters": [],
        "comments": {},
        "propertyMap": {},
        "translations": {},
        "overview": "",
        "config": config,
    }

    arguments = pd.read_csv(f"outputs/{config['output_dir']}/args.csv")
    arguments.set_index("arg-id", inplace=True)
    arg_num = len(arguments)
    relation_df = pd.read_csv(f"outputs/{config['output_dir']}/relations.csv")
    comments = pd.read_csv(f"inputs/{config['input']}.csv")
    clusters = pd.read_csv(f"outputs/{config['output_dir']}/hierarchical_clusters.csv")
    labels = pd.read_csv(f"outputs/{config['output_dir']}/hierarchical_merge_labels.csv")
    # print("clusters columns:", clusters.columns)
    # print("clusters sample:", clusters.head())

    hidden_properties_map: dict[str, list[str]] = config["hierarchical_aggregation"]["hidden_properties"]

    results["arguments"] = _build_arguments(clusters, comments, relation_df, config)
    results["clusters"] = _build_cluster_value(labels, arg_num)

    # results["comments"] = _build_comments_value(
    #     comments, arguments, hidden_properties_map
    # )
    results["comment_num"] = len(comments)
    results["translations"] = _build_translations(config)
    # 属性情報のカラムは、元データに対して指定したカラムとclassificationするカテゴリを合わせたもの
    results["propertyMap"] = _build_property_map(arguments, comments, hidden_properties_map, config)

    with open(f"outputs/{config['output_dir']}/hierarchical_overview.txt") as f:
        overview = f.read()
    # print("overview")
    # print(overview)
    results["overview"] = overview

    # Convert non-serializable NumPy types to native Python types
    results = json_serialize_numpy(results)

    with open(path, "w") as file:
        json.dump(results, file, indent=2, ensure_ascii=False)
    # TODO: サンプリングロジックを実装したいが、現状は全件抽出
    create_custom_intro(config)
    if config["is_pubcom"]:
        add_original_comments(labels, arguments, relation_df, clusters, config)
    return True


def create_custom_intro(config):
    dataset = config["output_dir"]
    args_path = PIPELINE_DIR / f"outputs/{dataset}/args.csv"
    comments = pd.read_csv(PIPELINE_DIR / f"inputs/{config['input']}.csv")
    result_path = PIPELINE_DIR / f"outputs/{dataset}/hierarchical_result.json"

    input_count = len(comments)
    args_count = len(pd.read_csv(args_path))
    processed_num = min(input_count, config["extraction"]["limit"])

    print(f"Input count: {input_count}")
    print(f"Args count: {args_count}")

    base_custom_intro = """{intro}
分析対象となったデータの件数は{processed_num}件で、これらのデータから{args_count}件の意見（議論）を抽出し、グループ化を行った。
"""

    intro = config["intro"]
    custom_intro = base_custom_intro.format(intro=intro, processed_num=processed_num, args_count=args_count)

    with open(result_path) as f:
        result = json.load(f)
    result["config"]["intro"] = custom_intro
    with open(result_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)


def add_original_comments(labels, arguments, relation_df, clusters, config):
    # 大カテゴリ（cluster-level-1）に該当するラベルだけ抽出
    labels_lv1 = labels[labels["level"] == 1][["id", "label"]].rename(
        columns={"id": "cluster-level-1-id", "label": "category_label"}
    )
    # print("DEBUG: arguments columns:", arguments.columns.tolist())
    # print("DEBUG: clusters columns:", clusters.columns.tolist())
    # print("DEBUG: labels_lv1 columns:", labels_lv1.columns.tolist())

    # arguments と clusters をマージ
    merged = arguments.merge(clusters[["arg-id", "cluster-level-1-id"]], on="arg-id")
    # print("DEBUG: merged (arguments + clusters) columns:", merged.columns.tolist())
    # print("DEBUG: merged sample (head):", merged.head())

    merged = merged.merge(labels_lv1, on="cluster-level-1-id", how="left")
    # print("DEBUG: merged (with labels_lv1) columns:", merged.columns.tolist())

    merged = merged.merge(relation_df, on="arg-id", how="left")
    # print("DEBUG: merged (with relation_df) columns:", merged.columns.tolist())
    # print("DEBUG: merged (with relation_df) sample:", merged.head())

    comments = pd.read_csv(PIPELINE_DIR / f"inputs/{config['input']}.csv")
    # comments 側の summary を削除（もし存在する場合）。抽出された方だけを使う。
    if "summary" in comments.columns:
        print("comments(inputs) 側の summary を削除します")
        comments = comments.drop(columns=["summary"])

    comments["comment-id"] = comments["comment-id"].astype(str)
    merged["comment-id"] = merged["comment-id"].astype(str)
    # print("DEBUG: comments columns:", comments.columns.tolist())
    # print("DEBUG: comments sample:", comments.head())

    merged = merged.merge(comments, on="comment-id", how="left")
    # print("DEBUG: merged (with comments) columns:", merged.columns.tolist())
    # print("DEBUG: merged (with comments) sample:", merged.head())

    # 必要カラム整形
    final_cols = ["comment-id", "comment-body", "arg-id", "argument", "summary", "cluster-level-1-id", "category_label"]

    for col in ["x", "y", "source", "url"]:
        if col in comments.columns:
            final_cols.append(col)

    attribute_columns = []
    for col in comments.columns:
        if col.startswith("attribute_"):
            attribute_columns.append(col)
            final_cols.append(col)

    # print(f"DEBUG: 属性カラム検出: {attribute_columns}")
    # print(f"DEBUG: final_cols to select: {final_cols}")

    # カラム存在確認
    missing_cols = [col for col in final_cols if col not in merged.columns]
    if missing_cols:
        print(f"⚠ WARNING: 以下のカラムが final_df に存在しません: {missing_cols}")
        print("DEBUG: 全 available columns in final_df:", merged.columns.tolist())

    # 必要なカラムを選択（あえて落とさない）
    final_df = merged[[col for col in final_cols if col in merged.columns]]

    # リネーム
    final_df = final_df.rename(
        columns={
            "cluster-level-1-id": "category_id",
            "category_label": "category",
            "arg-id": "arg_id",
            "argument": "argument",
            "summary": "summary",
            "comment-body": "original-comment",
        }
    )

    # 保存
    output_path = PIPELINE_DIR / f"outputs/{config['output_dir']}/final_result_with_comments.csv"
    final_df.to_csv(output_path, index=False)
    print(f"✅ final_result_with_comments.csv を出力しました: {output_path}")


def _build_arguments(
    clusters: pd.DataFrame, comments: pd.DataFrame, relation_df: pd.DataFrame, config: dict
) -> list[Argument]:
    """
    Build the arguments list including summary, original comments, attributes, and source URL
    """
    # クラスタID列を特定
    cluster_columns = [col for col in clusters.columns if col.startswith("cluster-level-") and "id" in col]

    # コメント DataFrame をコピーして ID を文字列化
    comments_copy = comments.copy()
    comments_copy["comment-id"] = comments_copy["comment-id"].astype(str)

    # 引数とコメントのマッピングを取得
    arg_comment_map: dict[str, str] = {}
    if "comment-id" in relation_df.columns:
        relation_df["comment-id"] = relation_df["comment-id"].astype(str)
        arg_comment_map = dict(zip(relation_df["arg-id"], relation_df["comment-id"], strict=False))

    # 属性カラムを検出
    attribute_columns = [col for col in comments.columns if col.startswith("attribute_")]

    arguments: list[Argument] = []
    for _, row in clusters.iterrows():
        # cluster_ids をリスト化
        cluster_ids = ["0"] + [str(row[col]) for col in cluster_columns]

        # ベース情報をセット
        argument: Argument = {
            "arg_id": str(row["arg-id"]),
            "argument": str(row["argument"]),
            "summary": str(row.get("summary", "")),
            "original_comment": "",
            "x": float(row["x"]),
            "y": float(row["y"]),
            "p": 0,
            "cluster_ids": cluster_ids,
            "attributes": None,
            "url": None,
        }

        # マッピングがある場合に元コメント・URL・属性を付与
        comment_id = arg_comment_map.get(row["arg-id"])
        if comment_id:
            comment_rows = comments_copy[comments_copy["comment-id"] == comment_id]
            if not comment_rows.empty:
                comment_row = comment_rows.iloc[0]

                # URL の追加
                if config.get("enable_source_link", False) and comment_row.get("url") is not None:
                    argument["url"] = str(comment_row["url"])

                # 属性の追加
                if attribute_columns:
                    attrs: dict[str, str] = {}
                    for attr_col in attribute_columns:
                        attr_name = attr_col.replace("attribute_", "")
                        value = comment_row.get(attr_col)
                        if isinstance(value, (np.integer, np.floating)):
                            value = value.item()
                        elif isinstance(value, np.ndarray):
                            value = value.tolist()
                        attrs[attr_name] = value
                    if any(v is not None for v in attrs.values()):
                        argument["attributes"] = attrs

                # 原文の追加
                argument["original_comment"] = str(comment_row.get("comment-body", ""))

        arguments.append(argument)

    return arguments


def _build_cluster_value(melted_labels: pd.DataFrame, total_num: int) -> list[Cluster]:
    results: list[Cluster] = [
        Cluster(
            level=0,
            id="0",
            label="全体",
            takeaway="",
            value=int(total_num),  # Convert to native int
            parent="",
            density_rank_percentile=0,
        )
    ]

    for _, melted_label in melted_labels.iterrows():
        # Convert potential NumPy types to native Python types
        level = (
            int(melted_label["level"]) if isinstance(melted_label["level"], int | np.integer) else melted_label["level"]
        )
        cluster_id = str(melted_label["id"])
        label = str(melted_label["label"])
        takeaway = str(melted_label["description"])
        value = (
            int(melted_label["value"]) if isinstance(melted_label["value"], int | np.integer) else melted_label["value"]
        )
        parent = str(melted_label.get("parent", "全体"))

        # Handle density_rank_percentile which might be None or a numeric value
        density_rank = melted_label.get("density_rank_percentile")
        if density_rank is not None:
            if isinstance(density_rank, float | np.floating):
                density_rank = float(density_rank)
            elif isinstance(density_rank, int | np.integer):
                density_rank = int(density_rank)

        cluster_value = Cluster(
            level=level,
            id=cluster_id,
            label=label,
            takeaway=takeaway,
            value=value,
            parent=parent,
            density_rank_percentile=density_rank,
        )
        results.append(cluster_value)
    return results


def _build_comments_value(
    comments: pd.DataFrame,
    arguments: pd.DataFrame,
    hidden_properties_map: dict[str, list[str]],
):
    comment_dict: dict[str, dict[str, str]] = {}
    useful_comment_ids = set(arguments["comment-id"].values)
    for _, row in comments.iterrows():
        id = row["comment-id"]
        if id in useful_comment_ids:
            res = {"comment": row["comment-body"]}
            should_skip = any(row[prop] in hidden_values for prop, hidden_values in hidden_properties_map.items())
            if should_skip:
                continue
            comment_dict[str(id)] = res

    return comment_dict


def _build_translations(config):
    languages = list(config.get("translation", {}).get("languages", []))
    if len(languages) > 0:
        with open(PIPELINE_DIR / f"outputs/{config['output_dir']}/translations.json") as f:
            translations = f.read()
        return json.loads(translations)
    return {}


def _build_property_map(
    arguments: pd.DataFrame, comments: pd.DataFrame, hidden_properties_map: dict[str, list[str]], config: dict
) -> dict[str, dict[str, str]]:
    property_columns = list(hidden_properties_map.keys()) + list(config["extraction"]["categories"].keys())
    property_map = defaultdict(dict)

    # 指定された property_columns が arguments に存在するかチェック
    missing_cols = [col for col in property_columns if col not in arguments.columns]
    if missing_cols:
        raise ValueError(
            f"指定されたカラム {missing_cols} が args.csv に存在しません。"
            "設定ファイルaggregation / hidden_propertiesから該当カラムを取り除いてください。"
        )

    for prop in property_columns:
        for arg_id, row in arguments.iterrows():
            # LLMによるcategory classificationがうまく行かず、NaNの場合はNoneにする
            value = row[prop] if not pd.isna(row[prop]) else None

            # Convert NumPy types to Python native types
            if value is not None:
                if isinstance(value, np.integer):
                    value = int(value)
                elif isinstance(value, np.floating):
                    value = float(value)
                elif isinstance(value, np.ndarray):
                    value = value.tolist()
                else:
                    # Convert any other types to string to ensure serialization
                    try:
                        value = str(value)
                    except Exception as e:
                        print(f"Error converting value to string: {e}")
                        value = None

            # Make sure arg_id is string
            str_arg_id = str(arg_id)
            property_map[prop][str_arg_id] = value

    return property_map


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Usage: python steps/hierarchical_aggregation.py [dataset-slug]")
        sys.exit(1)
    slug = sys.argv[1]
    # config に input キーとして slug を設定
    # hierarchical_aggregation 設定を空で初期化
    config = {
        "intro": {},
        "input": slug,
        "output_dir": slug,
        "is_pubcom": False,
        "enable_source_link": False,
        "hierarchical_aggregation": {"sampling_num": 30, "hidden_properties": {}},
        "extraction": {"limit": 2000, "prompt": {}, "categories": {}},
    }
    hierarchical_aggregation(config)
