// dataMerge.ts
// biome-ignore lint/style/useImportType: <explanation>
import { ClusterWithChildren } from "../components/types";

export interface SummaryEvaluation {
  silhouetteScore: number | null;
  silhouetteScore1: number | null;
  clarity: number | null;
  coherence: number | null;
  consistency: number | null;
  distinctiveness: number | null;
}

export interface MergedEvaluationResult {
  clusters: ClusterWithChildren[];
  summaryEvaluation: SummaryEvaluation;
}

export function mergeEvaluationData(
  clusters: ClusterWithChildren[],
  evaluationData: {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    llm: Record<string, any>;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    silhouetteUmap: Record<string, any>;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    silhouetteEmbedding: Record<string, any>;
  }
): MergedEvaluationResult {
  const newClusters: ClusterWithChildren[] = clusters.map((cluster) => {
    const llmEval = evaluationData.llm?.[cluster.innerId];
    const umapScore = evaluationData.silhouetteUmap?.[cluster.innerId];
    const embedScore = evaluationData.silhouetteEmbedding?.[cluster.innerId];

    return {
      ...cluster,
      evaluation: {
        llm: llmEval
          ? {
              clarity: llmEval.clarity ?? null,
              coherence: llmEval.coherence ?? null,
              consistency: llmEval.consistency ?? null,
              distinctiveness: llmEval.distinctiveness ?? null,
              comment: llmEval.comment ?? "",
            }
          : undefined,
        silhouette: {
          umap: umapScore?.score ?? null,
          embedding: embedScore?.score ?? null,
        },
      },
    };
  });

  const summaryEvaluation: SummaryEvaluation = {
    silhouetteScore: evaluationData.silhouetteUmap?.__overall ?? null,
    silhouetteScore1: evaluationData.silhouetteEmbedding?.__overall ?? null,
    clarity: null,
    coherence: null,
    consistency: null,
    distinctiveness: null,
  };

  return {
    clusters: newClusters,
    summaryEvaluation,
  };
}
