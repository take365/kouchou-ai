import { CsvData } from "../parseCsv";
import { PromptSettings } from "../types";
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
  local_llm_address,
  local_embedding_model,
  skip_extraction,
  auto_cluster
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
  local_llm_address?: string;
  local_embedding_model?: string; 
  skip_extraction?: boolean; 
  auto_cluster?: boolean;
}): Promise<void> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASEPATH}/admin/reports`,
      {
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
          local_llm_address,
          local_embedding_model,
          skip_extraction,     
          auto_cluster        
        }),
      }
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return;
  } catch (error) {
    throw handleApiError(error, "レポート作成に失敗しました");
  }
}
