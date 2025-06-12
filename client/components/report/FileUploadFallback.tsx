"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Analysis } from "@/components/report/Analysis";
import { BackButton } from "@/components/report/BackButton";
import { ClientContainer } from "@/components/report/ClientContainer";
import { Overview } from "@/components/report/Overview";
import { Reporter } from "@/components/reporter/Reporter";
import { FileUploadDropzone, FileUploadList, FileUploadRoot } from "@/components/ui/file-upload";
import type { Meta, Result } from "@/type";
import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";

interface Props {
  meta?: Meta;
}

export function FileUploadFallback({ meta }: Props) {
  const [result, setResult] = useState<Result | null>(null);
  const handleChange = async (e: { acceptedFiles: File[] }) => {
    const file = e.acceptedFiles[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Result;
      setResult(data);
    } catch (err) {
      console.error("Invalid JSON", err);
    }
  };

  if (result) {
    return (
      <>
        <div className="container">
          <Header />
          <Overview result={result} />
          <ClientContainer result={result} />
          <Analysis result={result} />
          <BackButton />
          {meta && (
            <Box maxW="750px" mx="auto" mb={24}>
              <Reporter meta={meta} />
            </Box>
          )}
        </div>
        {meta && <Footer meta={meta} />}
      </>
    );
  }

  return (
    <>
      <div className="container">
        <Header />
        <Box maxW="750px" mx="auto" my={24}>
          <Text mb={4}>hierarchical_result.jsonをアップロードしてください</Text>
          <FileUploadRoot
            w="full"
            alignItems="stretch"
            accept={["application/json"]}
            inputProps={{ multiple: false }}
            onFileChange={handleChange}
          >
            <Box>
              <FileUploadDropzone label="JSON file" description=".json" />
            </Box>
            <FileUploadList clearable showSize />
          </FileUploadRoot>
        </Box>
      </div>
      {meta && <Footer meta={meta} />}
    </>
  );
}
