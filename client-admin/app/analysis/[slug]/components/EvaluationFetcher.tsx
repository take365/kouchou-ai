// EvaluationFetcher.tsx
"use client";
import { useState } from "react";
// biome-ignore lint/style/useImportType: <explanation>
import { ClusterWithChildren } from "./types";
import { mergeEvaluationData } from "../utils/dataMerge";

interface SummaryEvaluation {
  silhouetteScore: number | null;
  silhouetteScore1: number | null;
  clarity: number | null;
  coherence: number | null;
  consistency: number | null;
  distinctiveness: number | null;
}

interface Props {
  slug: string;
  initialClusters: ClusterWithChildren[];
  onUpdate: (clusters: ClusterWithChildren[], summary: SummaryEvaluation) => void;
}

export default function EvaluationFetcher({ slug, initialClusters, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleFetchClick() {
    try {
      setLoading(true);

      // --- APIリクエスト ---
      const [llmRes, umapRes, embedRes] = await Promise.all([
        fetch(`/admin/evaluation/${slug}`),
        fetch(`/admin/evaluation/${slug}/silhouette/umap/level1/clusters`),
        fetch(`/admin/evaluation/${slug}/silhouette/embedding/level1/clusters`)
      ]);

      const [llmData, umapData, embedData] = await Promise.all([
        llmRes.json(),
        umapRes.json(),
        embedRes.json()
      ]);

      // --- 結果のマージ ---
      const merged = mergeEvaluationData(initialClusters, {
        llm: llmData,
        silhouetteUmap: umapData,
        silhouetteEmbedding: embedData,
      });

      console.log("[DEBUG] Merged clusters:", merged.clusters);
      console.log("[DEBUG] Summary evaluation:", merged.summaryEvaluation);

      onUpdate(merged.clusters, merged.summaryEvaluation);
    } catch (e) {
      console.error("[ERROR] Failed to fetch evaluation data:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="my-2">
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
<button onClick={handleFetchClick} disabled={loading} className="mr-2">
        評価データを取得
      </button>
      {loading && <span>取得中...</span>}
    </div>
  );
}
