import type { Result } from "@/type";

// 子クラスタ付きクラスタ構造
export interface ClusterWithChildren {
  id: string;
  label: string;
  children?: ClusterWithChildren[];
  innerId: string; // ← これを明示的に追加
  evaluation?: {
    llm?: {
      clarity: number | null;
      coherence: number | null;
      consistency: number | null;
      distinctiveness: number | null;
      comment: string;
    };
    silhouette?: {
      umap: number | null;
      embedding: number | null;
    };
  };
}
// 評価スコアなどを持たせたクラスタ構造（右パネル表示用）
export type ClusterWithEval = ClusterWithChildren & {
  score?: number;
  evaluation?: {
    positive: string[];
    negative: string[];
    comment: string;
  };
};
