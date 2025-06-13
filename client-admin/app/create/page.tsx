"use client";

import { Header } from "@/components/Header";
import { Checkbox } from "@/components/ui/checkbox";
import { toaster } from "@/components/ui/toaster";
import {
  Box,
  Button,
  Field,
  Flex,
  HStack,
  Heading,
  Presence,
  Tabs,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createReport } from "./api/report";
import { AISettingsSection } from "./components/AISettingsSection";
import { BasicInfoSection } from "./components/BasicInfoSection";
import { CsvFileTab } from "./components/CsvFileTab";
import { SpreadsheetTab } from "./components/SpreadsheetTab";
import { WarningSection } from "./components/WarningSection";
import { useAISettings } from "./hooks/useAISettings";
import { useBasicInfo } from "./hooks/useBasicInfo";
import { useClusterSettings } from "./hooks/useClusterSettings";
import { useInputData } from "./hooks/useInputData";
import { usePromptSettings } from "./hooks/usePromptSettings";
import { type CsvData, parseCsv } from "./parseCsv";
import { showErrorToast } from "./utils/error-handler";
import { generateDefaultQuestionTitle } from "./utils/generateTitle";
import { validateFormValues } from "./utils/validation";

function generateClusterList(min: number, topMax: number, bottomMax: number): number[] {
  const clusters: number[] = [];

  let current = min;
  while (current <= topMax) {
    clusters.push(current);
    current *= 2;
  }

  current = topMax + 1;
  while (current <= bottomMax) {
    clusters.push(current);
    current *= 2;
  }

  return clusters;
}
/**
 * レポート作成ページ
 */
export default function Page() {
  const router = useRouter();
  const { open, onToggle } = useDisclosure();
  const [loading, setLoading] = useState<boolean>(false);
  const [autoDownloadOptions, setAutoDownloadOptions] = useState({ html: true, csv: true, json: true });

  // カスタムフックの使用
  const basicInfo = useBasicInfo();
  const clusterSettings = useClusterSettings();
  const promptSettings = usePromptSettings();
  const aiSettings = useAISettings();
  const inputData = useInputData(clusterSettings.setRecommended);

  /**
   * タブ切り替え時の処理
   */
  const handleTabValueChange = (details: { value: string }) => {
    inputData.setInputType(details.value as "file" | "spreadsheet");
  };

  /**
   * レポート作成の送信
   */
  const runCreateReport = async (): Promise<boolean> => {
    setLoading(true);

    // フォーム入力値のバリデーション
    const validation = validateFormValues({
      input: basicInfo.input,
      question: basicInfo.question,
      intro: basicInfo.intro,
      clusterLv1: clusterSettings.clusterLv1,
      clusterLv2: clusterSettings.clusterLv2,
      model: aiSettings.model,
      extractionPrompt: promptSettings.extraction,
      inputType: inputData.inputType,
      csv: inputData.csv,
      spreadsheetImported: inputData.spreadsheetImported,
      selectedCommentColumn: inputData.selectedCommentColumn,
      csvColumns: inputData.csvColumns,
      selectedAttributeColumns: inputData.selectedAttributeColumns,
      provider: aiSettings.provider,
      modelOptions: aiSettings.getCurrentModels(),
    });

    if (!validation.isValid) {
      toaster.create({
        type: "error",
        title: "入力エラー",
        description: validation.errorMessage,
      });
      setLoading(false);
      return false;
    }

    let comments: CsvData[] = [];
    try {
      if (inputData.inputType === "file" && inputData.csv) {
        const parsed = await parseCsv(inputData.csv);
        comments = parsed.map((row, index) => {
          const rowData = row as unknown as Record<string, unknown>;

          // コメントオブジェクトの作成（基本フィールド）
          const comment: CsvData = {
            id: row.id || `csv-${index + 1}`,
            comment: rowData[inputData.selectedCommentColumn] as string,
            source: (rowData.source as string) || null,
            url: (rowData.url as string) || null,
          };

          // 選択された属性カラムの値を直接追加（"attribute" プレフィックス付き）
          for (const attrCol of inputData.selectedAttributeColumns) {
            if (rowData[attrCol] !== undefined && rowData[attrCol] !== null) {
              // 属性カラムの名前に "attribute" プレフィックスを追加
              const attributeKey = `attribute_${attrCol}`;
              comment[attributeKey] = rowData[attrCol] as string;
            }
          }

          return comment;
        });

        if (comments.length < clusterSettings.clusterLv2) {
          const confirmProceed = window.confirm(
            `csvファイルの行数 (${comments.length}) が設定された意見グループ数 (${clusterSettings.clusterLv2}) を下回っています。このまま続けますか？
    \n※コメントから抽出される意見が設定された意見グループ数に満たない場合、処理中にエラーになる可能性があります（一つのコメントから複数の意見が抽出されることもあるため、問題ない場合もあります）。
    \n意見グループ数を変更する場合は、「AI詳細設定」を開いてください。`,
          );
          if (!confirmProceed) {
            setLoading(false);
            return false;
          }
        }
      } else if (inputData.inputType === "spreadsheet" && inputData.spreadsheetImported) {
        comments = inputData.spreadsheetData.map((row, index) => {
          const rowData = row as unknown as Record<string, unknown>;

          // コメントオブジェクトの作成（基本フィールド）
          const comment: CsvData = {
            id: row.id || `spreadsheet-${index + 1}`,
            comment: rowData[inputData.selectedCommentColumn] as string,
            source: row.source || null,
            url: row.url || null,
          };

          // 選択された属性カラムの値を直接追加（"attribute" プレフィックス付き）
          for (const attrCol of inputData.selectedAttributeColumns) {
            if (rowData[attrCol] !== undefined && rowData[attrCol] !== null) {
              // 属性カラムの名前に "attribute" プレフィックスを追加
              const attributeKey = `attribute_${attrCol}`;
              comment[attributeKey] = rowData[attrCol] as string;
            }
          }

          return comment;
        });
      }
    } catch (e) {
      toaster.create({
        type: "error",
        title: "データの読み込みに失敗しました",
        description: e as string,
      });
      setLoading(false);
      return false;
    }

    try {
      const promptData = promptSettings.getPromptSettings();
      // ✅ タイトルと調査概要の補完
      const input = basicInfo.input;
      let question = basicInfo.question.trim();
      let intro = basicInfo.intro.trim();

      if (question === "") {
        question = generateDefaultQuestionTitle({ inputData, clusterSettings, aiSettings });
      }
      if (intro === "") {
        intro = "";
      }
      await createReport({
        input: basicInfo.input,
        question,
        intro,
        comments,
        cluster: [clusterSettings.clusterLv1, clusterSettings.clusterLv2],
        provider: aiSettings.provider,
        model: aiSettings.model,
        workers: aiSettings.workers,
        prompt: promptData,
        is_pubcom: aiSettings.isPubcomMode,
        inputType: inputData.inputType,
        is_embedded_at_local: aiSettings.isEmbeddedAtLocal,
        enable_source_link: aiSettings.enableSourceLink,
        local_llm_address: aiSettings.provider === "local" ? aiSettings.localLLMAddress : undefined,
        skip_extraction: aiSettings.skipExtraction,
        skip_initial_labelling: aiSettings.skipInitialLabelling,
        skip_merge_labelling: aiSettings.skipMergeLabelling,
        skip_overview: aiSettings.skipOverview,
        openai_api_key:
          process.env.NEXT_PUBLIC_ONETIME_LLM_API_KEY_MODE === "true" && aiSettings.provider === "openai"
            ? aiSettings.openaiApiKey
            : undefined,
        openrouter_api_key:
          process.env.NEXT_PUBLIC_ONETIME_LLM_API_KEY_MODE === "true" && aiSettings.provider === "openrouter"
            ? aiSettings.openrouterApiKey
            : undefined,
        auto_cluster_enabled: clusterSettings.autoClusterEnabled,
        clusterLv1_min: clusterSettings.clusterLv1Min,
        clusterLv1_max: clusterSettings.clusterLv1Max,
        clusterLv2_min: clusterSettings.clusterLv2Min,
        clusterLv2_max: clusterSettings.clusterLv2Max,
      });
      return true;
    } catch (e) {
      showErrorToast(toaster, e, "レポート作成に失敗しました");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const onSubmitAndReturn = async () => {
    const ok = await runCreateReport();
    if (ok) router.replace("/");
  };

  const onSubmitAutoDownload = async () => {
    if (!autoDownloadOptions.html && !autoDownloadOptions.csv && !autoDownloadOptions.json) {
      toaster.create({
        type: "error",
        title: "出力形式の選択が必要です",
        description: "少なくとも1つ選んでください。",
      });
      return;
    }

    const ok = await runCreateReport();
    if (ok) {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(autoDownloadOptions).map(([k, v]) => [k, String(v)])),
      ).toString();
      router.push(`/progress/${basicInfo.input}?${q}`);
    }
  };

  // メインコンポーネントのレンダリング
  return (
    <div className={"container"}>
      <Header />
      <Box mx={"auto"} maxW={"800px"}>
        <Flex justify="space-between" align="center" my={10}>
          <Heading size="lg">新しいレポートを作成する</Heading>
          <a href={`${process.env.NEXT_PUBLIC_CLIENT_BASEPATH}/`} target="_blank" rel="noopener noreferrer">
            <Button colorScheme="teal" variant="outline">
              データファイルからレポートを表示する
            </Button>
          </a>
        </Flex>
        <VStack gap={5}>
          {/* 基本情報セクション */}
          <BasicInfoSection
            input={basicInfo.input}
            question={basicInfo.question}
            intro={basicInfo.intro}
            isIdValid={basicInfo.isIdValid}
            onIdChange={basicInfo.handleIdChange}
            onQuestionChange={basicInfo.handleQuestionChange}
            onIntroChange={basicInfo.handleIntroChange}
          />
          {/* 入力データセクション */}
          <Field.Root>
            <Field.Label>入力データ</Field.Label>
            <Tabs.Root
              defaultValue="file"
              value={inputData.inputType}
              onValueChange={handleTabValueChange}
              variant="enclosed"
              width="100%"
            >
              <Tabs.List>
                <Tabs.Trigger value="file">CSVファイル</Tabs.Trigger>
                <Tabs.Trigger value="spreadsheet">Googleスプレッドシート</Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>

              <Box p={4}>
                {/* CSVファイルタブ */}
                <CsvFileTab
                  csv={inputData.csv}
                  setCsv={inputData.setCsv}
                  csvColumns={inputData.csvColumns}
                  setCsvColumns={inputData.setCsvColumns}
                  selectedCommentColumn={inputData.selectedCommentColumn}
                  setSelectedCommentColumn={inputData.setSelectedCommentColumn}
                  selectedAttributeColumns={inputData.selectedAttributeColumns}
                  setSelectedAttributeColumns={inputData.setSelectedAttributeColumns}
                  clusterSettings={clusterSettings}
                />

                {/* スプレッドシートタブ */}
                <SpreadsheetTab
                  spreadsheetUrl={inputData.spreadsheetUrl}
                  setSpreadsheetUrl={inputData.setSpreadsheetUrl}
                  spreadsheetImported={inputData.spreadsheetImported}
                  spreadsheetLoading={inputData.spreadsheetLoading}
                  spreadsheetData={inputData.spreadsheetData}
                  importedId={inputData.importedId}
                  canImport={inputData.canImport}
                  csvColumns={inputData.csvColumns}
                  selectedCommentColumn={inputData.selectedCommentColumn}
                  setSelectedCommentColumn={inputData.setSelectedCommentColumn}
                  selectedAttributeColumns={inputData.selectedAttributeColumns}
                  setSelectedAttributeColumns={inputData.setSelectedAttributeColumns}
                  clusterSettings={clusterSettings}
                  onImport={() => inputData.importSpreadsheet(basicInfo.input)}
                  onClearData={inputData.clearSpreadsheetData}
                />
              </Box>
            </Tabs.Root>
          </Field.Root>
          {/* AI詳細設定ボタン */}
          <HStack justify={"flex-end"} w={"full"}>
            <Button onClick={onToggle} variant={"outline"} w={"200px"}>
              AI詳細設定 (オプション)
            </Button>
          </HStack>
          {/* AI詳細設定セクション */}
          <Presence present={open} w={"full"}>
            <AISettingsSection
              provider={aiSettings.provider}
              model={aiSettings.model}
              workers={aiSettings.workers}
              isPubcomMode={aiSettings.isPubcomMode}
              enableSourceLink={aiSettings.enableSourceLink}
              isEmbeddedAtLocal={aiSettings.isEmbeddedAtLocal}
              localLLMAddress={aiSettings.localLLMAddress}
              onProviderChange={aiSettings.handleProviderChange}
              onModelChange={aiSettings.handleModelChange}
              fetchLocalLLMModels={aiSettings.fetchLocalLLMModels}
              onWorkersChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) {
                  aiSettings.handleWorkersChange(v);
                }
              }}
              onIncreaseWorkers={aiSettings.increaseWorkers}
              onDecreaseWorkers={aiSettings.decreaseWorkers}
              onPubcomModeChange={aiSettings.handlePubcomModeChange}
              onEnableSourceLinkChange={aiSettings.handleEnableSourceLinkChange}
              onEmbeddedAtLocalChange={(checked) => {
                if (checked === "indeterminate") return;
                aiSettings.setIsEmbeddedAtLocal(checked);
              }}
              setLocalLLMAddress={aiSettings.setLocalLLMAddress}
              getModelDescription={aiSettings.getModelDescription}
              getProviderDescription={aiSettings.getProviderDescription}
              getCurrentModels={aiSettings.getCurrentModels}
              requiresConnectionSettings={aiSettings.requiresConnectionSettings}
              isEmbeddedAtLocalDisabled={aiSettings.isEmbeddedAtLocalDisabled}
              promptSettings={promptSettings}
              // ✅ スキップ系の追加
              skipExtraction={aiSettings.skipExtraction}
              setSkipExtraction={aiSettings.setSkipExtraction}
              skipInitialLabelling={aiSettings.skipInitialLabelling}
              setSkipInitialLabelling={aiSettings.setSkipInitialLabelling}
              skipMergeLabelling={aiSettings.skipMergeLabelling}
              setSkipMergeLabelling={aiSettings.setSkipMergeLabelling}
              skipOverview={aiSettings.skipOverview}
              setSkipOverview={aiSettings.setSkipOverview}
              openaiApiKey={aiSettings.openaiApiKey}
              setOpenaiApiKey={aiSettings.setOpenaiApiKey}
              openrouterApiKey={aiSettings.openrouterApiKey}
              setOpenrouterApiKey={aiSettings.setOpenrouterApiKey}
            />
          </Presence>
          {/* 警告メッセージ */}
          <WarningSection />
          {process.env.NEXT_PUBLIC_ENVIRONMENT !== "instant" && (
            <Button className="gradientBg shadow" size="2xl" w="300px" onClick={onSubmitAndReturn} loading={loading}>
              レポート作成を開始
            </Button>
          )}
          <Button colorScheme="teal" size="2xl" w="300px" onClick={onSubmitAutoDownload} loading={loading}>
            レポート作成(自動ダウンロード)
          </Button>
          <Box mt={4}>
            <Text fontWeight="bold" mb={1}>
              出力ファイル形式（自動ダウンロード）
            </Text>

            <Box display="flex" flexDirection="column" gap="8px">
              <Checkbox
                checked={autoDownloadOptions.html}
                onCheckedChange={({ checked }) =>
                  setAutoDownloadOptions((prev) => ({ ...prev, html: checked === true }))
                }
              >
                {`シンプルなレポート（kouchou_${basicInfo.input || "<report-id>"}.html）`}
              </Checkbox>

              <Checkbox
                checked={autoDownloadOptions.csv}
                onCheckedChange={({ checked }) =>
                  setAutoDownloadOptions((prev) => ({ ...prev, csv: checked === true }))
                }
              >
                {`CSV形式データ（kouchou_${basicInfo.input || "<report-id>"}.csv）`}
              </Checkbox>

              <Checkbox
                checked={autoDownloadOptions.json}
                onCheckedChange={({ checked }) =>
                  setAutoDownloadOptions((prev) => ({ ...prev, json: checked === true }))
                }
              >
                {`構造化分析データ（kouchou_${basicInfo.input || "<report-id>"}.json）`}
              </Checkbox>
            </Box>
          </Box>{" "}
        </VStack>
      </Box>
    </div>
  );
}
