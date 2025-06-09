import type { CsvData } from "../parseCsv";
import type { PromptSettings } from "../types";
import { handleApiError } from "../utils/error-handler";

/**
 * レポート作成APIを呼び出す
 */
export async function createReport({
  input,
  question,
  intro,
  comments,
  cluster,
  provider,
  model,
  workers,
  prompt,
  is_pubcom,
  inputType,
  is_embedded_at_local,
  enable_source_link,
  local_llm_address,
  skip_extraction,
  skip_initial_labelling,
  skip_merge_labelling,
  skip_overview,
  auto_cluster_enabled,
  clusterLv1_min,
  clusterLv1_max,
  clusterLv2_min,
  clusterLv2_max,
}: {
  input: string;
  question: string;
  intro: string;
  comments: CsvData[];
  cluster: [number, number];
  provider: string;
  model: string;
  workers: number;
  prompt: PromptSettings;
  is_pubcom: boolean;
  inputType: string;
  is_embedded_at_local: boolean;
  enable_source_link: boolean;
  local_llm_address?: string;
  skip_extraction?: boolean;
  skip_initial_labelling?: boolean;
  skip_merge_labelling?: boolean;
  skip_overview?: boolean;
  auto_cluster_enabled?: boolean;
  clusterLv1_min?: number;
  clusterLv1_max?: number;
  clusterLv2_min?: number;
  clusterLv2_max?: number;
}): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASEPATH}/admin/reports`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        question,
        intro,
        comments,
        cluster,
        provider,
        model,
        workers,
        prompt,
        is_pubcom,
        inputType,
        is_embedded_at_local,
        enable_source_link,
        local_llm_address,
        skip_extraction,
        skip_initial_labelling,
        skip_merge_labelling,
        skip_overview,
        auto_cluster_enabled,
        clusterLv1_min,
        clusterLv1_max,
        clusterLv2_min,
        clusterLv2_max,
      }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return;
  } catch (error) {
    throw handleApiError(error, "レポート作成に失敗しました");
  }
}
