import type { useAISettings } from "../hooks/useAISettings";
import type { useClusterSettings } from "../hooks/useClusterSettings";
import type { useInputData } from "../hooks/useInputData";

/**
 * 自動生成される質問タイトル文字列を作成する
 */
export function generateDefaultQuestionTitle({
  inputData,
  clusterSettings,
  aiSettings,
}: {
  inputData: ReturnType<typeof useInputData>;
  clusterSettings: ReturnType<typeof useClusterSettings>;
  aiSettings: ReturnType<typeof useAISettings>;
}): string {
  const providerLabel = aiSettings.provider === "none" ? "LLMなし" : `${aiSettings.provider}/${aiSettings.model}`;

  const source =
    inputData.inputType === "file"
      ? (inputData.csv?.name ?? "ファイル未指定")
      : (inputData.spreadsheetUrl.split("/")[5] ?? "シート未指定");

  const col = inputData.selectedCommentColumn || "カラム未選択";

  const clustering = clusterSettings.autoClusterEnabled
    ? `自動 (${clusterSettings.clusterLv1Max}+${clusterSettings.clusterLv2Max})`
    : `手動 (${clusterSettings.clusterLv1}+${clusterSettings.clusterLv2})`;

  const skips = [
    aiSettings.skipExtraction && "抽出スキップ",
    aiSettings.skipInitialLabelling && "初期ラベルスキップ",
    aiSettings.skipMergeLabelling && "統合ラベルスキップ",
    aiSettings.skipOverview && "要約スキップ",
  ]
    .filter(Boolean)
    .join(", ");

  const extra =
    aiSettings.provider !== "none"
      ? ` (${aiSettings.workers}並列${aiSettings.isEmbeddedAtLocal ? "｜ローカル埋込" : ""})`
      : "";

  return `[${source}] ${col}列｜${clustering}｜${providerLabel}${extra}${skips ? `｜${skips}` : ""}`;
}
