// page.tsx
import { getApiBaseUrl } from "@/app/utils/api";
import ClusterCard from "./components/ClusterCard";
import EvaluationWrapper from "./components/EvaluationWrapper";
// biome-ignore lint/style/useImportType: <explanation>
import { ClusterWithChildren } from "./components/types";

interface SummaryEvaluation {
  silhouetteScore: number | null;
  silhouetteScore1: number | null;
  clarity: number | null;
  coherence: number | null;
  consistency: number | null;
  distinctiveness: number | null;
}

type PageProps = {
  params: { slug: string };
};

export default async function AnalysisDetailPage({ params }: PageProps) {
  const { slug } = params;

  const res = await fetch(`${getApiBaseUrl()}/reports/${slug}`, {
    headers: {
      "x-api-key": "public",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return <div>読み込み失敗</div>;
  }

  const result = await res.json();
  console.log("[DEBUG] result", result);
  const topClusters: ClusterWithChildren[] = result.clusters.filter(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        (c: any) => c.level === 1 && !c.parentId
  );

  const initialSummary: SummaryEvaluation = {
    silhouetteScore: null,
    silhouetteScore1: null,
    clarity: null,
    coherence: null,
    consistency: null,
    distinctiveness: null,
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 上部：分析概要 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-2">分析概要</h1>
        <p>{result.overview}</p>
        <div className="text-sm text-gray-500 mt-2">
          コメント数: {result.comment_num} / 意見数: {result.arguments?.length ?? 0}
        </div>
      </div>
      {/* 全体評価：評価取得＋パネル */}
      <EvaluationWrapper
        slug={slug}
        initialClusters={topClusters}
        initialSummary={initialSummary}
      />

      {/* クラスタ表示部分 */}
      <div className="space-y-6">
        {topClusters.map((group) => (
          <ClusterCard key={group.id} group={group} result={result} />
        ))}
      </div>
    </div>
  );
}
