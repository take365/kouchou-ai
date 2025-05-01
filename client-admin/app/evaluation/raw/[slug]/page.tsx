// app/evaluation/raw/[slug]/page.tsx
import { getApiBaseUrl } from "@/app/utils/api";

export default async function RawEvaluationPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const base = getApiBaseUrl();

  const endpoints = [
    { url: `/reports/${slug}`, key: "public" },
    { url: `/admin/evaluation/${slug}`, key: "admin" },
    { url: `/admin/evaluation/${slug}/silhouette/umap/level1/clusters`, key: "admin" },
    { url: `/admin/evaluation/${slug}/silhouette/embedding/level1/clusters`, key: "admin" },
    { url: `/admin/evaluation/${slug}/silhouette/umap/level1/points`, key: "admin" },
    { url: `/admin/evaluation/${slug}/silhouette/embedding/level1/points`, key: "admin" },
  ];

  const responses = await Promise.all(
    endpoints.map(async ({ url, key }) => {
      const res = await fetch(base + url, {
        headers: { "x-api-key": key },
        cache: "no-store",
      });
      const json = await res.json();
      return { url, json };
    })
  );

  return (
    <div className="min-h-screen px-4 py-10">
      <style>
        {`
          html, body {
            background: white !important;
            color: black !important;
          }
          footer {
            display: none !important;
          }
        `}
      </style>
      <div className="bg-white text-black max-w-screen-lg mx-auto p-6 rounded shadow-md">
        <h1 className="text-xl font-bold">評価用生データ（JSON）</h1>
        {responses.map((res, idx) => (
          <div key={idx}>
            <h2 className="mt-6 mb-2 font-semibold text-blue-700">{res.url}</h2>
            <div className="overflow-x-auto bg-gray-100 p-3 text-xs rounded border border-gray-300">
              <pre>{JSON.stringify(res.json, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}