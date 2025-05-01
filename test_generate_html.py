from pathlib import Path

from server.src.services.standalone_html_generator import \
    generate_standalone_html

# 任意のslugと出力先のパス
slug = "7d615d10-97ea-4197-a431-c6f88fc8afe7"
output_dir = Path("server/broadlistening/pipeline/outputs") / slug
template_dir = Path("server/templates")

# 実行
generate_standalone_html(slug, output_dir, template_dir)
