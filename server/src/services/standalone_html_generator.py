import argparse
import colorsys
import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader


def generate_standalone_html(slug: str, output_dir: Path, template_dir: Path) -> None:
    """
    指定されたレポートIDの階層下にある hierarchical_result.json を元に
    スタンドアローンな report.html を出力する。

    Args:
        slug (str): レポートID
        output_dir (Path): 出力ディレクトリ
        template_dir (Path): HTMLテンプレートが入っているディレクトリ
    """
    result_path = output_dir / "hierarchical_result.json"
    if not result_path.exists():
        print(f"Error: hierarchical_result.json not found for slug '{slug}'.")
        print("Available directories with hierarchical_result.json:")
        base_dir = Path("broadlistening/pipeline/outputs")
        found = False
        for d in base_dir.iterdir():
            candidate = d / "hierarchical_result.json"
            if candidate.exists():
                print(f" - {d.name}")
                found = True
        if not found:
            print("No directories with hierarchical_result.json found in outputs.")
        sys.exit(1)

    # 読み込み時、UTF-8を試し、失敗したらShift-JISで読み込む
    try:
        with open(result_path, "r", encoding="utf-8") as f:
            result_data = json.load(f)
    except UnicodeDecodeError:
        with open(result_path, "r", encoding="shift_jis") as f:
            result_data = json.load(f)

    # クラスタ情報を階層構造に変換
    cluster_by_id = {c["id"]: c for c in result_data["clusters"]}
    cluster_children = {}
    for c in result_data["clusters"]:
        parent = c.get("parent")  # 'parent' キーを利用
        if parent:  # 空文字の場合はトップレベル
            cluster_children.setdefault(parent, []).append(c)

    def build_cluster_tree(cluster):
        children = cluster_children.get(cluster["id"], [])
        return {
            **cluster,
            "children": [build_cluster_tree(child) for child in children]
        }

    top_level_clusters = [c for c in result_data["clusters"] if c.get("level") == 1]
    cluster_tree = [build_cluster_tree(c) for c in top_level_clusters]

    # 色をクラスタIDに基づいて生成（第一階層のみ）
    color_map = {}
    for i, c in enumerate(top_level_clusters):
        hue = (i * 0.14) % 1.0  # 色相をずらす
        rgb = colorsys.hsv_to_rgb(hue, 0.6, 0.7)
        hex_color = '#{:02x}{:02x}{:02x}'.format(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))
        color_map[c["id"]] = hex_color

    # HTMLテンプレート処理
    env = Environment(loader=FileSystemLoader(str(template_dir)))
    # カスタムテスト: 'search'
    env.tests['search'] = lambda value, sub: sub in value
    template = env.get_template("report_template.html")
    rendered_html = template.render(
        result=result_data,
        cluster_tree=cluster_tree,
        color_map=color_map,
    )

    output_path = output_dir / "report.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(rendered_html)

    print(f"[OK] generated standalone_html: {output_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Generate standalone report HTML from hierarchical_result.json."
    )
    parser.add_argument("slug", nargs="?", help="Report slug (e.g., 7d615d10-97ea-4197-a431-c6f88fc8afe7)")
    args = parser.parse_args()

    if not args.slug:
        print("No slug provided.")
        print("Available directories with hierarchical_result.json in 'broadlistening/pipeline/outputs':")
        base_dir = Path("broadlistening/pipeline/outputs")
        found = False
        for d in base_dir.iterdir():
            candidate = d / "hierarchical_result.json"
            if candidate.exists():
                print(f" - {d.name}")
                found = True
        if not found:
            print("No directories with hierarchical_result.json found.")
        sys.exit(1)

    slug = args.slug
    output_dir = Path("broadlistening/pipeline/outputs") / slug
    template_dir = Path("templates")
    generate_standalone_html(slug, output_dir, template_dir)

if __name__ == "__main__":
    main()
