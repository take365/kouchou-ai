import { Box, Container, Heading, Text } from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import { getApiBaseUrl } from "@/app/utils/api";

function scoreToColor(score: number | string) {
  if (typeof score !== "number") return "transparent";
  switch (score) {
    case 5:
      return "green.50";
    case 4:
      return "blue.50";
    case 3:
      return "transparent";
    case 2:
      return "orange.100";
    case 1:
      return "red.100";
    default:
      return "transparent";
  }
}

export default async function MergedEvaluationPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const base = getApiBaseUrl();

  const fetchJson = async (path: string, key: string) => {
    const res = await fetch(`${base}${path}`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    return await res.json();
  };

  const [report, llmEval, umapClusterEval, embedClusterEval, umapPointEval, embedPointEval] = await Promise.all([
    fetchJson(`/reports/${slug}`, "public"),
    fetchJson(`/admin/evaluation/${slug}`, "admin"),
    fetchJson(`/admin/evaluation/${slug}/silhouette/umap/level1/clusters`, "admin"),
    fetchJson(`/admin/evaluation/${slug}/silhouette/embedding/level1/clusters`, "admin"),
    fetchJson(`/admin/evaluation/${slug}/silhouette/umap/level1/points`, "admin"),
    fetchJson(`/admin/evaluation/${slug}/silhouette/embedding/level1/points`, "admin"),
  ]);

  function scoreEmbedding(value: number | null): number | string {
    if (value == null || isNaN(value)) return "-";
    if (value < -0.05) return 1;
    if (value < 0.0) return 2;
    if (value < 0.05) return 3;
    if (value < 0.10) return 4;
    return 5;
  }

  function scoreUmap(value: number | null): number | string {
    if (value == null || isNaN(value)) return "-";
    if (value < -0.25) return 1;
    if (value < 0.0) return 2;
    if (value < 0.25) return 3;
    if (value < 0.50) return 4;
    return 5;
  }

  const clusters = report.clusters.filter((c: any) => c.level === 1);
  const clusterMap = clusters.map((cluster: any) => {
    const innerId = cluster.innerId ?? cluster.id;
    const llm = llmEval[innerId]?.[innerId] || {};
    const umap = umapClusterEval.clusters?.[innerId] ?? null;
    const embed = embedClusterEval.clusters?.[innerId] ?? null;
    const comment = llm.comment ? `評価コメント：${llm.comment}` : null;
    const comments = report.arguments.filter((a: any) => a.cluster_ids.includes(innerId));
    const commentsWithScores = comments.map((a: any) => {
      const umapVal = umapPointEval[a.arg_id] ?? null;
      const embedVal = embedPointEval[a.arg_id] ?? null;
      return {
        ...a,
        umap: umapVal,
        embed: embedVal,
        umapScore: scoreUmap(umapVal),
        embedScore: scoreEmbedding(embedVal),
      };
    });
    return {
      ...cluster,
      llm,
      umap,
      embed,
      embedScore: scoreEmbedding(embed),
      umapScore: scoreUmap(umap),
      comments: commentsWithScores,
      comment,
    };
  });

  return (
    <Container maxW="6xl" py={10}>
      <Heading size="lg" mb={6}>統合評価結果</Heading>

      {/* 総合評価表示 */}
      <Box mb={8} p={4} bg="gray.50" borderWidth="1px" rounded="md">
        <Heading size="md" mb={2}>総合評価</Heading>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>明確さ</Table.ColumnHeader>
              <Table.ColumnHeader>一貫性</Table.ColumnHeader>
              <Table.ColumnHeader>整合性</Table.ColumnHeader>
              <Table.ColumnHeader>差異性</Table.ColumnHeader>
              <Table.ColumnHeader>ベクトル空間</Table.ColumnHeader>
              <Table.ColumnHeader>UMAP</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell isNumeric bg={scoreToColor(Math.round((clusterMap.reduce((sum, c) => sum + (c.llm.clarity ?? 0), 0) / clusterMap.length)))}>{(clusterMap.reduce((sum, c) => sum + (c.llm.clarity ?? 0), 0) / clusterMap.length).toFixed(2)}</Table.Cell>
              <Table.Cell isNumeric bg={scoreToColor(Math.round((clusterMap.reduce((sum, c) => sum + (c.llm.coherence ?? 0), 0) / clusterMap.length)))}>{(clusterMap.reduce((sum, c) => sum + (c.llm.coherence ?? 0), 0) / clusterMap.length).toFixed(2)}</Table.Cell>
              <Table.Cell isNumeric bg={scoreToColor(Math.round((clusterMap.reduce((sum, c) => sum + (c.llm.consistency ?? 0), 0) / clusterMap.length)))}>{(clusterMap.reduce((sum, c) => sum + (c.llm.consistency ?? 0), 0) / clusterMap.length).toFixed(2)}</Table.Cell>
              <Table.Cell isNumeric bg={scoreToColor(Math.round((clusterMap.reduce((sum, c) => sum + (c.llm.distinctiveness ?? 0), 0) / clusterMap.length)))}>{(clusterMap.reduce((sum, c) => sum + (c.llm.distinctiveness ?? 0), 0) / clusterMap.length).toFixed(2)}</Table.Cell>
              <Table.Cell isNumeric bg={scoreToColor(Math.round((clusterMap.reduce((sum, c) => sum + (typeof c.embedScore === 'number' ? c.embedScore : 0), 0) / clusterMap.length)))}>{(clusterMap.reduce((sum, c) => sum + (typeof c.embedScore === 'number' ? c.embedScore : 0), 0) / clusterMap.length).toFixed(2)}（{(clusterMap.reduce((sum, c) => sum + (c.embed ?? 0), 0) / clusterMap.length).toFixed(3)}）</Table.Cell>
              <Table.Cell isNumeric bg={scoreToColor(Math.round((clusterMap.reduce((sum, c) => sum + (typeof c.umapScore === 'number' ? c.umapScore : 0), 0) / clusterMap.length)))}>{(clusterMap.reduce((sum, c) => sum + (typeof c.umapScore === 'number' ? c.umapScore : 0), 0) / clusterMap.length).toFixed(2)}（{(clusterMap.reduce((sum, c) => sum + (c.umap ?? 0), 0) / clusterMap.length).toFixed(3)}）</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Box>
      {clusterMap.map((cluster: any) => (
        <Box key={cluster.id} mb={12} p={6} bg="white" rounded="md" shadow="md">
          <Heading size="md" color="blue.700" mb={2}>{cluster.label}（{cluster.comments.length}件）</Heading>
          {cluster.takeaway && (
            <Text fontSize="sm" color="gray.700" fontStyle="italic" mb={4}>{cluster.takeaway}</Text>
          )}

          

          <Table.Root mt={4}>
  <Table.Header>
    <Table.Row>
      <Table.ColumnHeader>明確さ</Table.ColumnHeader>
      <Table.ColumnHeader>一貫性</Table.ColumnHeader>
      <Table.ColumnHeader>整合性</Table.ColumnHeader>
      <Table.ColumnHeader>差異性</Table.ColumnHeader>
      <Table.ColumnHeader>ベクトル空間</Table.ColumnHeader>
      <Table.ColumnHeader>UMAP</Table.ColumnHeader>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell bg={scoreToColor(cluster.llm.clarity)}>{cluster.llm.clarity ?? "-"}</Table.Cell>
      <Table.Cell bg={scoreToColor(cluster.llm.coherence)}>{cluster.llm.coherence ?? "-"}</Table.Cell>
      <Table.Cell bg={scoreToColor(cluster.llm.consistency)}>{cluster.llm.consistency ?? "-"}</Table.Cell>
      <Table.Cell bg={scoreToColor(cluster.llm.distinctiveness)}>{cluster.llm.distinctiveness ?? "-"}</Table.Cell>
      <Table.Cell bg={scoreToColor(cluster.embedScore)}>{cluster.embedScore}（{cluster.embed?.toFixed(3) ?? "-"}）</Table.Cell>
      <Table.Cell bg={scoreToColor(cluster.umapScore)}>{cluster.umapScore}（{cluster.umap?.toFixed(3) ?? "-"}）</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>

          {cluster.comment && <Text fontSize="sm" color="gray.600" mt={4} mb={4}>{cluster.comment}</Text>}

          <Heading size="sm" mt={4} mb={2}>意見一覧</Heading>
          <Table.Root variant="striped">
            <Table.Header>
              <Table.Row>
  <Table.ColumnHeader width="60%">意見</Table.ColumnHeader>
  <Table.ColumnHeader>ベクトル空間</Table.ColumnHeader>
  <Table.ColumnHeader>UMAP</Table.ColumnHeader>
</Table.Row>
            </Table.Header>
            <Table.Body>
              {cluster.comments.map((c: any) => (
                <Table.Row key={c.arg_id}>
  <Table.Cell>{c.argument}</Table.Cell>
  <Table.Cell isNumeric bg={scoreToColor(c.embedScore)}>{c.embedScore}（{c.embed?.toFixed(3) ?? "-"}）</Table.Cell>
  <Table.Cell isNumeric bg={scoreToColor(c.umapScore)}>{c.umapScore}（{c.umap?.toFixed(3) ?? "-"}）</Table.Cell>
</Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      ))}
    </Container>
  );
}
