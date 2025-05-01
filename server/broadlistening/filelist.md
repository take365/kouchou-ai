## 📥 入力ファイル

### `inputs/{input}.csv`

- **用途**: コメント入力
- **主な項目**:
    - `comment-id`: コメントの一意識別子
    - `comment-body`: コメント本文
    - 任意: 属性（例: 地域、性別などのプロパティ列）

---

## 🧩 中間・最終出力ファイル一覧

### `args.csv`（from `extraction.py`）

- **用途**: 抽出された意見リスト
- **主な項目**:
    - `arg-id`: 識別子（例: `A123_0`）
    - `argument`: 抽出された意見文
    - 任意: 分類カテゴリ（例: `sentiment`, `genre`）

---

### `relations.csv`（from `extraction.py`）

- **用途**: コメントと意見の対応表
- **主な項目**:
    - `arg-id`
    - `comment-id`

---

### `embeddings.pkl`（from `embedding.py`）

- **用途**: 各意見のベクトル埋め込み
- **構造**: `arg-id` に対応した `embedding`（list of float）

---

### `hierarchical_clusters.csv`（from `hierarchical_clustering.py`）

- **用途**: UMAPで圧縮された座標とクラスタID
- **主な項目**:
    - `arg-id`
    - `argument`
    - `x`, `y`: UMAP 2次元座標
    - `cluster-level-1-id`, `cluster-level-2-id`, ...: 階層クラスタID

---

### `hierarchical_initial_labels.csv`（from `hierarchical_initial_labelling.py`）

- **用途**: クラスタに対する初期ラベルと説明
- **主な項目**:
    - `cluster-level-{n}-id`
    - `cluster-level-{n}-label`: ラベル名（例: “交通安全”）
    - `cluster-level-{n}-description`: ラベルの説明文

---

### `hierarchical_merge_labels.csv`（from `hierarchical_merge_labelling.py`）

- **用途**: ラベル統合・階層関係・密度情報を持つクラスタ一覧
- **主な項目**:
    - `level`, `id`: クラスタの階層レベルとID
    - `label`, `description`
    - `value`: 所属意見数
    - `parent`: 上位クラスタID
    - `density`, `density_rank`, `density_rank_percentile`: 密度評価

---

### `hierarchical_overview.txt`（from `hierarchical_overview.py`）

- **用途**: 全体的なクラスタの概要文（LLM生成）
- **形式**: プレーンテキスト

---

### `hierarchical_result.json`（from `hierarchical_aggregation.py`）

- **用途**: WebレポートやAPI用の集約出力（最終JSON）
- **主な構造**:
    - `arguments`: 各意見とクラスタ所属、UMAP座標
    - `clusters`: 全クラスタ（ラベル、階層、密度）
    - `propertyMap`: プロパティごとの分類
    - `overview`: クラスタの要約文
    - `config`: 実行時設定
    - `translations`, `comments`: 任意で追加

---

### `final_result_with_comments.csv`（from `hierarchical_aggregation.py`）

- **用途**: 意見に元コメントやカテゴリを紐づけた一覧
- **主な項目**:
    - `comment-id`, `original-comment`
    - `arg-id`, `argument`
    - `category_id`, `category`
    - 任意: `source`, `url`（元コメント由来）

---

### `report/*`（from `hierarchical_visualization.py`）

- **用途**: NPMでビルドされたHTMLレポート一式（グラフ・可視化）