import { Checkbox } from "@/components/ui/checkbox";
import { Button, Field, HStack, Input, NativeSelect, Textarea, VStack } from "@chakra-ui/react";

/**
 * AI設定セクションコンポーネント
 */
export function AISettingsSection({
  provider,
  model,
  workers,
  isPubcomMode,
  onProviderChange,
  onModelChange,
  onWorkersChange,
  onIncreaseWorkers,
  onDecreaseWorkers,
  onPubcomModeChange,
  getModelDescription,
  getProviderDescription,
  getCurrentModels,
  requiresConnectionSettings,
  isEmbeddedAtLocalDisabled,
  localLLMAddress,
  setLocalLLMAddress,
  promptSettings,
  isEmbeddedAtLocal,
  onEmbeddedAtLocalChange,
  fetchLocalLLMModels,
  localEmbeddingModel,
  setLocalEmbeddingModel,
  getLocalEmbeddingModelOptions,
  skipExtraction,
  setSkipExtraction,
}: {
  provider: string;
  model: string;
  workers: number;
  isPubcomMode: boolean;
  onProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onWorkersChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onIncreaseWorkers: () => void;
  onDecreaseWorkers: () => void;
  onPubcomModeChange: (checked: boolean | "indeterminate") => void;
  getModelDescription: () => string;
  getProviderDescription: () => string;
  getCurrentModels: () => { value: string; label: string }[];
  requiresConnectionSettings: () => boolean;
  isEmbeddedAtLocalDisabled?: () => boolean;
  localLLMAddress?: string;
  setLocalLLMAddress?: (value: string) => void;
  fetchLocalLLMModels?: () => Promise<boolean>;
  promptSettings: {
    extraction: string;
    initialLabelling: string;
    mergeLabelling: string;
    overview: string;
    setExtraction: (value: string) => void;
    setInitialLabelling: (value: string) => void;
    setMergeLabelling: (value: string) => void;
    setOverview: (value: string) => void;
  };
  isEmbeddedAtLocal: boolean;
  localEmbeddingModel: string;
  setLocalEmbeddingModel: (value: string) => void;
  onEmbeddedAtLocalChange: (checked: boolean | "indeterminate") => void;
  getLocalEmbeddingModelOptions: () => { value: string; label: string }[];
  skipExtraction: boolean;
  setSkipExtraction: (value: boolean) => void;
}) {
  const modelOptions = getCurrentModels();
  const localModelOptions = getLocalEmbeddingModelOptions();
  return (
    <VStack gap={10}>
      <Field.Root>
        <Checkbox
          checked={isPubcomMode}
          onCheckedChange={(details) => {
            const { checked } = details;
            onPubcomModeChange(checked);
          }}
        >
          csv出力モード
        </Checkbox>
        <Field.HelperText>
          元のコメントと要約された意見をCSV形式で出力します。完成したCSVファイルはレポート一覧ページからダウンロードできます。
        </Field.HelperText>
      </Field.Root>

      <Field.Root>
        <Field.Label>AIプロバイダー</Field.Label>
        <NativeSelect.Root w={"40%"}>
          <NativeSelect.Field value={provider} onChange={onProviderChange}>
            <option value={"openai"}>OpenAI</option>
            <option value={"azure"}>Azure</option>
            <option value={"openrouter"} disabled>
              OpenRouter (将来対応予定)
            </option>
            <option value={"local"}>LocalLLM</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Field.HelperText>{getProviderDescription()}</Field.HelperText>
      </Field.Root>

      {requiresConnectionSettings() && (
        <Field.Root>
          <Field.Label>LocalLLM接続設定</Field.Label>
          <HStack>
            <Input
              placeholder="ollama:11434"
              value={localLLMAddress}
              onChange={(e) => setLocalLLMAddress?.(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (fetchLocalLLMModels) {
                  await fetchLocalLLMModels();
                }
              }}
            >
              モデル取得
            </Button>
          </HStack>
          <Field.HelperText>
            OpenAI互換インターフェースで動作しているLLMサーバ（ollamaやLMStudio）のアドレスを指定してください。
            広聴AIのdockerでollamaサーバを起動している場合は ollama:11434で接続できます。
          </Field.HelperText>
        </Field.Root>
      )}

      <Field.Root>
        <Field.Label>並列実行数</Field.Label>
        <HStack>
          <Button onClick={onDecreaseWorkers} variant="outline">
            -
          </Button>
          <Input type="number" value={workers.toString()} min={1} max={100} onChange={onWorkersChange} />
          <Button onClick={onIncreaseWorkers} variant="outline">
            +
          </Button>
        </HStack>
        <Field.HelperText>
          LLM APIの並列実行数です。値を大きくすることでレポート出力が速くなりますが、
          APIプロバイダーのTierによってはレートリミットの上限に到達し、レポート出力が失敗する可能性があります。
        </Field.HelperText>
      </Field.Root>

      <Field.Root>
        <Field.Label>AIモデル</Field.Label>
        <NativeSelect.Root w={"40%"}>
          <NativeSelect.Field value={model} onChange={onModelChange}>
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Field.HelperText>{getModelDescription()}</Field.HelperText>
      </Field.Root>

      <Field.Root>
        <Checkbox
          checked={isEmbeddedAtLocal}
          onCheckedChange={(details) => {
            const { checked } = details;
            if (checked === "indeterminate") return;
            onEmbeddedAtLocalChange(checked);
          }}
          disabled={isEmbeddedAtLocalDisabled?.()}
        >
          埋め込み処理をサーバ内で行う
        </Checkbox>
        {isEmbeddedAtLocal && (
          <Field.Root>
            <Field.Label>ローカル埋め込みモデル</Field.Label>
            <NativeSelect.Root w={"60%"}>
              <NativeSelect.Field value={localEmbeddingModel} onChange={(e) => setLocalEmbeddingModel(e.target.value)}>
                <option value="">選択してください</option>
                {localModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Field.HelperText>サーバ内で使用するローカル埋め込みモデルを選択してください。</Field.HelperText>
          </Field.Root>
        )}
        <Field.HelperText>
          埋め込み処理をサーバ内で行うことで、APIの利用料金を削減します。
          精度に関しては未検証であり、OpenAIを使った場合と大きく異なる結果になる可能性があります。
          {isEmbeddedAtLocalDisabled?.() && (
            <span style={{ color: "red" }}>
              ※ LocalLLMプロバイダーを選択している場合、この設定は強制的にONになります
            </span>
          )}
        </Field.HelperText>
      </Field.Root>
      {/* ✅ 追加チェックボックス：抽出処理スキップ */}
      <Field.Root>
        <Checkbox
          checked={skipExtraction}
          onCheckedChange={(details) => {
            const { checked } = details;
            if (checked !== "indeterminate") setSkipExtraction(checked);
          }}
        >
          抽出処理をスキップする
        </Checkbox>
        <Field.HelperText>抽出済のデータや整えられたデータを使用する場合にチェックしてください。</Field.HelperText>
      </Field.Root>
      <Field.Root>
        <Field.Label>抽出プロンプト</Field.Label>
        <Textarea
          h={"150px"}
          value={promptSettings.extraction}
          onChange={(e) => promptSettings.setExtraction(e.target.value)}
        />
        <Field.HelperText>AIに提示する抽出プロンプトです(通常は変更不要です)</Field.HelperText>
      </Field.Root>

      <Field.Root>
        <Field.Label>初期ラベリングプロンプト</Field.Label>
        <Textarea
          h={"150px"}
          value={promptSettings.initialLabelling}
          onChange={(e) => promptSettings.setInitialLabelling(e.target.value)}
        />
        <Field.HelperText>AIに提示する初期ラベリングプロンプトです(通常は変更不要です)</Field.HelperText>
      </Field.Root>

      <Field.Root>
        <Field.Label>統合ラベリングプロンプト</Field.Label>
        <Textarea
          h={"150px"}
          value={promptSettings.mergeLabelling}
          onChange={(e) => promptSettings.setMergeLabelling(e.target.value)}
        />
        <Field.HelperText>AIに提示する統合ラベリングプロンプトです(通常は変更不要です)</Field.HelperText>
      </Field.Root>
      <Field.Root>
        <Field.Label>要約プロンプト</Field.Label>
        <Textarea
          h={"150px"}
          value={promptSettings.overview}
          onChange={(e) => promptSettings.setOverview(e.target.value)}
        />
        <Field.HelperText>AIに提示する要約プロンプトです(通常は変更不要です)</Field.HelperText>
      </Field.Root>
    </VStack>
  );
}
