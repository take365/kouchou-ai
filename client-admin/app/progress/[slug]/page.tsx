"use client";

import { getApiBaseUrl } from "@/app/utils/api";
import { Header } from "@/components/Header";
import { Box, Button, Flex, HStack, Heading, Steps, Text, VStack } from "@chakra-ui/react";
import { useEffect } from "react";
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

export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { progress, tokenUsageInput, tokenUsageOutput, estimatedCost, provider, model } = useReportProgressPoll(
    slug,
    true,
    false,
  );

  const currentStepIndex =
    progress === "completed" ? steps.length : stepKeys.indexOf(progress) === -1 ? 0 : stepKeys.indexOf(progress);

  useEffect(() => {
    if (progress === "completed") {
      const download = async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/admin/reports/${slug}/simple-html`, {
            headers: { "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "" },
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${slug}.html`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          }
        } catch (e) {
          console.error(e);
        }
      };
      download();
    }
  }, [progress, slug]);

  return (
    <div className="container">
      <Header />
      <Box mx="auto" maxW="600px">
        <Heading textAlign="center" my={10} fontSize="lg">
          レポート生成中: {slug}
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
        <VStack mt={6} spacing={2} align="start">
          <Text fontSize="sm">入力トークン: {tokenUsageInput.toLocaleString()}</Text>
          <Text fontSize="sm">出力トークン: {tokenUsageOutput.toLocaleString()}</Text>
          <Text fontSize="sm">推定コスト: {estimatedCost ? `$${estimatedCost.toFixed(6)}` : "-"}</Text>
          {provider && model && (
            <Text fontSize="sm">
              モデル: {provider}/{model}
            </Text>
          )}
        </VStack>
        {progress === "completed" && (
          <HStack justify="center" mt={10}>
            <Button onClick={() => window.open(`${process.env.NEXT_PUBLIC_CLIENT_BASEPATH}/${slug}`, "_blank")}>
              レポートを開く
            </Button>
          </HStack>
        )}
        {progress === "error" && (
          <Text color="red.600" mt={4}>
            エラーが発生しました。再度お試しください。
          </Text>
        )}
        <Text mt={10} fontSize="xs" color="gray.500">
          生成されたレポートの内容は必ずご自身で確認してください。
        </Text>
      </Box>
    </div>
  );
}
