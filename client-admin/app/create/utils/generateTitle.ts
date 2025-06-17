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

  // スキップフラグの短縮表示
  const skipFlags = [
    aiSettings.skipExtraction && "抽出",
    aiSettings.skipInitialLabelling && "初期",
    aiSettings.skipMergeLabelling && "統合",
    aiSettings.skipOverview && "要約",
  ].filter(Boolean) as string[];

  // ソースリンク機能が有効な場合のラベル
  const linkLabel = aiSettings.enableSourceLink ? "リンク付" : "";

  // 埋め込みに要約を利用する場合のラベル
  const classification = aiSettings.useSummary ? "要旨で分類" : "";

  // スキップ、リンク、分類をまとめる
  const suffixParts: string[] = [];
  if (skipFlags.length > 0) {
    suffixParts.push(`スキップ（${skipFlags.join(",")}）`);
  }
  if (linkLabel) {
    suffixParts.push(linkLabel);
  }
  if (classification) {
    suffixParts.push(classification);
  }
  const suffix = suffixParts.length > 0 ? `｜${suffixParts.join(", ")}` : "";

  const extra =
    aiSettings.provider !== "none"
      ? ` (${aiSettings.workers}並列${aiSettings.isEmbeddedAtLocal ? "｜ローカル埋込" : ""})`
      : "";

  return `[${source}] ${col}列｜${clustering}｜${providerLabel}${extra}${suffix}`;
}
