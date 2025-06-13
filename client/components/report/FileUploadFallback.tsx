"use client";

import { FileUploadDropzone, FileUploadList, FileUploadRoot } from "@/components/ui/file-upload";
import type { Result } from "@/type";
import { Box, Center, Heading, Spinner, Text } from "@chakra-ui/react";
import { useState } from "react";
import { Analysis } from "./Analysis";
import { ClientContainer } from "./ClientContainer";
import { Overview } from "./Overview";

export function FileUploadFallback() {
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (e: { acceptedFiles: File[] }) => {
    const file = e.acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Result;
      setResult(data);
    } catch (err) {
      console.error("Invalid JSON", err);
      alert("ファイルの読み込みに失敗しました。JSON形式を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <div className="container">
        <Overview result={result} />
        <ClientContainer result={result} />
        <Analysis result={result} />
      </div>
    );
  }

  return (
    <div className="container">
      <Box maxW="750px" mx="auto" my={24}>
        <Heading as="h2" size="md" mb={4} color="blue.600">
          {"構造化分析データ（kouchou_<report-id>.json）"} をアップロードしてください
        </Heading>
        <FileUploadRoot
          w="full"
          alignItems="stretch"
          accept={["application/json"]}
          inputProps={{ multiple: false }}
          onFileChange={handleChange}
        >
          <Box>
            <FileUploadDropzone label="JSONファイル" description=".json" />
          </Box>
          <FileUploadList clearable showSize />
        </FileUploadRoot>
        {isLoading && (
          <Center mt={6}>
            <Spinner size="lg" mr={3} />
            <Text>読み込み中です…</Text>
          </Center>
        )}
      </Box>
    </div>
  );
}
