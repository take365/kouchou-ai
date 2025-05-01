// EvaluationPanel.tsx
"use client";
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
  clusters: ClusterWithChildren[];
  summary: SummaryEvaluation;
}

export default function EvaluationPanel({ clusters, summary }: Props) {
  return (
    <div className="text-sm space-y-2">
      <div className="border-b pb-2 mb-2">
        <h3 className="font-semibold text-base">全体評価</h3>
        <div>AIによる意味の評価（LLM）</div>
        <ul className="list-disc list-inside ml-2">
          <li>明確さ: {summary.clarity ?? "未評価"}</li>
          <li>一貫性: {summary.coherence ?? "未評価"}</li>
          <li>論理整合性: {summary.consistency ?? "未評価"}</li>
          <li>他クラスタとの差異: {summary.distinctiveness ?? "未評価"}</li>
        </ul>
        <div className="mt-2">意見のまとまり度（ベクトル評価）</div>
        <ul className="list-disc list-inside ml-2">
          <li>ベクトル空間での評価（UMAP後）: {summary.silhouetteScore ?? "未評価"}</li>
          <li>可視化前の評価（embedding）: {summary.silhouetteScore1 ?? "未評価"}</li>
        </ul>
      </div>

      {clusters.map((cluster) => (
        <div key={cluster.id} className="border-t pt-2">
          <div className="font-semibold mb-1">クラスタ: {cluster.label}</div>
          <div>AIによる意味の評価（LLM）</div>
          <ul className="list-disc list-inside ml-2">
            <li>明確さ: {cluster.evaluation?.llm?.clarity ?? "未評価"}</li>
            <li>一貫性: {cluster.evaluation?.llm?.coherence ?? "未評価"}</li>
            <li>論理整合性: {cluster.evaluation?.llm?.consistency ?? "未評価"}</li>
            <li>他クラスタとの差異: {cluster.evaluation?.llm?.distinctiveness ?? "未評価"}</li>
          </ul>
          <div className="mt-1">意見のまとまり度（ベクトル評価）</div>
          <ul className="list-disc list-inside ml-2">
            <li>UMAP後: {cluster.evaluation?.silhouette?.umap ?? "未評価"}</li>
            <li>embedding: {cluster.evaluation?.silhouette?.embedding ?? "未評価"}</li>
          </ul>
        </div>
      ))}
    </div>
  );
}
