"use client";

import { getApiBaseUrl } from "@/app/utils/api";
import { Header } from "@/components/Header";
import { Box, Button, Flex, HStack, Heading, Steps, Text } from "@chakra-ui/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import useReportProgressPoll from "../../hooks/useReportProgressPoll";

const stepKeys = [
  "extraction",
  "embedding",
  "hierarchical_clustering",
  "hierarchical_initial_labelling",
  "hierarchical_merge_labelling",
  "hierarchical_overview",
  "hierarchical_aggregation",
  "hierarchical_visualization",
];

const steps = [
  { id: 1, title: "抽出" },
  { id: 2, title: "埋め込み" },
  { id: 3, title: "意見グループ化" },
  { id: 4, title: "初期ラベリング" },
  { id: 5, title: "統合ラベリング" },
  { id: 6, title: "概要生成" },
  { id: 7, title: "集約" },
  { id: 8, title: "可視化" },
];

export default function Page() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] : "";

  const router = useRouter();
  const searchParams = useSearchParams();

  // デフォルト値：html=true, csv=true, json=false
  const shouldDownloadHtml = searchParams.get("html") !== "false";
  const shouldDownloadCsv = searchParams.get("csv") !== "false";
  const shouldDownloadJson = searchParams.get("json") === "true";

  const {
    progress,
    errorMessage,
    errorStackTrace,
    tokenUsageInput,
    tokenUsageOutput,
    estimatedCost,
    provider,
    model,
  } = useReportProgressPoll(
    slug,
    true,
    false,
  );

  const currentStepIndex =
    progress === "completed" ? steps.length : stepKeys.indexOf(progress) === -1 ? 0 : stepKeys.indexOf(progress);

  const hasDownloaded = useRef(false);
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (progress === "completed" && !hasDownloaded.current) {
      hasDownloaded.current = true;

      router.replace(`/progress/${slug}`);

      const download = async () => {
        hasCompleted.current = true;
        try {
          if (shouldDownloadHtml) {
            const res = await fetch(`${getApiBaseUrl()}/admin/reports/${slug}/simple-html`, {
              headers: { "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "" },
            });
            if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `kouchou_${slug}.html`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } else {
              console.error("HTML download failed", res.status, res.statusText);
              return;
            }
          }

          if (shouldDownloadCsv) {
            const res = await fetch(`${getApiBaseUrl()}/admin/comments/${slug}/csv`, {
              headers: { "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "" },
            });
            if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `kouchou_${slug}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } else {
              console.error("CSV download failed", res.status, res.statusText);
            }
          }

          if (shouldDownloadJson) {
            const res = await fetch(`${getApiBaseUrl()}/admin/comments/${slug}/json`, {
              headers: { "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "" },
            });
            if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `kouchou_${slug}.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } else {
              console.error("JSON download failed", res.status, res.statusText);
            }
          }
        } catch (e) {
          console.error("Download error", e);
        }
      };
      download();
    }
  }, [progress, slug, shouldDownloadHtml, shouldDownloadCsv, shouldDownloadJson, router]);

  return (
    <div className="container">
      <Header />
      <Box mx="auto" maxW="600px">
        <Heading textAlign="center" my={10} fontSize="lg">
          {hasCompleted.current ? "レポート生成完了" : "レポート生成中"}: {slug}
        </Heading>
        <Box mt={8}>
          <Steps.Root defaultStep={currentStepIndex} count={steps.length}>
            <Steps.List>
              {steps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const stepColor = isCompleted ? "green.500" : "gray.300";
                return (
                  <Steps.Item key={step.id} index={index} title={step.title}>
                    <Flex direction="column" align="center">
                      <Steps.Indicator boxSize="24px" bg={stepColor} position="relative" />
                      <Steps.Title mt={1} fontSize="sm" whiteSpace="nowrap" textAlign="center" color={stepColor}>
                        {step.title}
                      </Steps.Title>
                    </Flex>
                    <Steps.Separator borderColor={stepColor} />
                  </Steps.Item>
                );
              })}
            </Steps.List>
          </Steps.Root>
        </Box>
        <Box mt={6}>
          <Text fontSize="sm">入力トークン: {tokenUsageInput.toLocaleString()}</Text>
          <Text fontSize="sm">出力トークン: {tokenUsageOutput.toLocaleString()}</Text>
          <Text fontSize="sm">推定コスト: {estimatedCost ? `$${estimatedCost.toFixed(6)}` : "-"}</Text>
          {provider && model && (
            <Text fontSize="sm">
              モデル: {provider}/{model}
            </Text>
          )}
        </Box>
        {progress === "completed" && (
          <HStack justify="center" mt={10}>
            <Button onClick={() => router.push("/create")}>新しいレポートを作成する</Button>
          </HStack>
        )}
        {progress === "error" && (
          <Box mt={4} color="red.600">
            <Text fontWeight="bold">エラーが発生しました</Text>
            {errorMessage && (
              <Text whiteSpace="pre-wrap" fontSize="sm" mt={2}>
                {errorMessage}
              </Text>
            )}
            {errorStackTrace && (
              <Box as="pre" whiteSpace="pre-wrap" fontSize="xs" mt={2} overflowX="auto">
                {errorStackTrace}
              </Box>
            )}
          </Box>
        )}
        <Text mt={10} fontSize="xs" color="gray.500">
          生成されたレポートの内容は必ずご自身で確認してください。
        </Text>
      </Box>
    </div>
  );
}
