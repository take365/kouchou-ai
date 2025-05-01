// EvaluationWrapper.tsx
"use client";
import { useState } from "react";
import EvaluationFetcher from "./EvaluationFetcher";
import EvaluationPanel from "./EvaluationPanel";
// biome-ignore lint/style/useImportType: <explanation>
import { ClusterWithChildren } from "./types";

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
  initialSummary: SummaryEvaluation;
}

export default function EvaluationWrapper({ slug, initialClusters, initialSummary }: Props) {
  const [clusters, setClusters] = useState<ClusterWithChildren[]>(initialClusters);
  const [summaryEvaluation, setSummaryEvaluation] = useState<SummaryEvaluation>(initialSummary);

  const handleUpdate = (
    updatedClusters: ClusterWithChildren[],
    updatedSummary: SummaryEvaluation
  ) => {
    console.log("[DEBUG] Updating clusters and summary in wrapper");
    setClusters(updatedClusters);
    setSummaryEvaluation(updatedSummary);
  };

  return (
    <div className="my-4">
      <div className="flex justify-between">
        <div>
          <h2 className="text-lg font-bold mb-2">AIによる意味の評価（LLM）</h2>
          <EvaluationPanel clusters={clusters} summary={summaryEvaluation} />
        </div>
        <EvaluationFetcher
          slug={slug}
          initialClusters={clusters}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
