import colorsys
import json
from pathlib import Path

from jinja2 import Environment, FileSystemLoader


def load_json_with_fallback(path: Path):
    """UTF-8優先 → SJISフォールバックでJSON読み込み"""
    if not path.exists():
        print(f"⚠️ Missing: {path}")
        return {}
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except UnicodeDecodeError:
        with open(path, encoding='shift_jis') as f:
            return json.load(f)


def generate_simple_html(config):
    output_dir = config["output_dir"]
    base_path = Path(f"outputs/{output_dir}")
    input_path = base_path / "hierarchical_result.json"
    output_path = base_path / "simple_report.html"
    overview_path = base_path / "hierarchical_overview.txt"
    template_dir = Path("templates")
    template_name = "simple_report_template.html"

    if not input_path.exists():
        raise FileNotFoundError(f"⛔ {input_path} が見つかりません")

    result = load_json_with_fallback(input_path)
    hierarchical_overview = overview_path.read_text(encoding="utf-8") if overview_path.exists() else ""

    # クラスタ構造を再構築
    clusters = result["clusters"]
    cluster_children = {}
    for c in clusters:
        parent = c.get("parent")
        if parent:
            cluster_children.setdefault(parent, []).append(c)

    def build_tree(cluster):
        cid = cluster["id"]
        cluster["children"] = [build_tree(child) for child in cluster_children.get(cid, [])]
        return cluster

    # 上位層クラスタのみ対象
    level1_clusters = [c for c in clusters if c.get("level") == 1]
    cluster_tree = [build_tree(c) for c in level1_clusters]

    # 色マップ（Lv1クラスタのみ）
    color_map = {}
    for i, c in enumerate(level1_clusters):
        hue = (i * 0.14) % 1.0
        rgb = colorsys.hsv_to_rgb(hue, 0.6, 0.7)
        hex_color = f'#{int(rgb[0] * 255):02x}{int(rgb[1] * 255):02x}{int(rgb[2] * 255):02x}'
        color_map[c["id"]] = hex_color

    # 上位クラスタごとに属する arguments を収集（Lv2経由でない）
    cluster_args_map = {}
    for c in level1_clusters:
        cluster_args_map[c["id"]] = [
            a for a in result["arguments"]
            if c["id"] in a.get("cluster_ids", [])
        ]

    env = Environment(loader=FileSystemLoader(str(template_dir)))
    env.tests["search"] = lambda value, sub: sub in value
    template = env.get_template(template_name)

    html = template.render(
        result=result,
        cluster_tree=cluster_tree,
        hierarchical_overview=hierarchical_overview,
        color_map=color_map,
        cluster_args_map=cluster_args_map  # JavaScriptで活用する場合にも利用可能
    )
    output_path.write_text(html, encoding="utf-8")
    print(f"✅ 出力完了: {output_path}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python generate_simple_html.py [dataset-slug]")
        sys.exit(1)
    generate_simple_html({"output_dir": sys.argv[1]})
