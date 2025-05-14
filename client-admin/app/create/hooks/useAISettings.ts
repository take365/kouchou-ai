import { toaster } from "@/components/ui/toaster";
import { ChangeEvent, useEffect, useState } from "react";

export type Provider = "openai" | "azure" | "openrouter" | "local";

export interface ModelOption {
  value: string;
  label: string;
}

export interface ProviderConfig {
  models: ModelOption[];
  description: string;
  requiresConnection?: boolean;
}

const STORAGE_KEY_PREFIX = "kouchou_ai_";
const STORAGE_KEYS = {
  PROVIDER: `${STORAGE_KEY_PREFIX}provider`,
  MODEL: `${STORAGE_KEY_PREFIX}model`,
  WORKERS: `${STORAGE_KEY_PREFIX}workers`,
  LOCAL_LLM_ADDRESS: `${STORAGE_KEY_PREFIX}local_llm_address`,
  IS_EMBEDDED_AT_LOCAL: `${STORAGE_KEY_PREFIX}is_embedded_at_local`,
};

// LocalLLMのデフォルトアドレスを定数化
const DEFAULT_LOCAL_LLM_ADDRESS = process.env.NEXT_PUBLIC_LOCAL_LLM_ADDRESS || "ollama:11434";

const OPENAI_MODELS: ModelOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "o3-mini", label: "o3-mini" }
];

/**
 * サーバーからモデルリストを取得する関数
 * @param provider プロバイダー名
 * @param address LocalLLM用アドレス（localプロバイダーの場合のみ）
 */
async function fetchModelsFromServer(
  provider: Provider,
  address?: string
): Promise<ModelOption[]> {
  const params = new URLSearchParams({ provider });
  if (provider === "local" && address) {
    params.append("address", address);
  }
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASEPATH}/admin/models?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
        "Content-Type": "application/json",
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const models = await response.json();
  return models;
}

/**
 * LocalStorageから値を取得する関数
 * @param key ストレージキー
 * @param defaultValue デフォルト値
 */
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`LocalStorageからの読み込みに失敗しました: ${key}`, error);
    return defaultValue;
  }
}

/**
 * LocalStorageに値を保存する関数
 * @param key ストレージキー
 * @param value 保存する値
 */
function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`LocalStorageへの保存に失敗しました: ${key}`, error);
  }
}

/**
 * AIモデル設定を管理するカスタムフック
 */
export function useAISettings() {
  const [provider, setProvider] = useState<Provider>(() => 
    getFromStorage<Provider>(STORAGE_KEYS.PROVIDER, "openai")
  );
  const [model, setModel] = useState<string>(() => 
    getFromStorage<string>(STORAGE_KEYS.MODEL, "gpt-4o-mini")
  );
  const [workers, setWorkers] = useState<number>(() => 
    getFromStorage<number>(STORAGE_KEYS.WORKERS, 30)
  );
  const [isPubcomMode, setIsPubcomMode] = useState<boolean>(true);
  const [isEmbeddedAtLocal, setIsEmbeddedAtLocal] = useState<boolean>(() => 
    getFromStorage<boolean>(STORAGE_KEYS.IS_EMBEDDED_AT_LOCAL, false)
  );
  
  const [localLLMAddress, setLocalLLMAddress] = useState<string>(() => 
    getFromStorage<string>(STORAGE_KEYS.LOCAL_LLM_ADDRESS, DEFAULT_LOCAL_LLM_ADDRESS)
  );
  
  const [openRouterModels, setOpenRouterModels] = useState<ModelOption[]>([]);
  const [localLLMModels, setLocalLLMModels] = useState<ModelOption[]>([]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROVIDER, provider);
  }, [provider]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MODEL, model);
  }, [model]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.WORKERS, workers);
  }, [workers]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LOCAL_LLM_ADDRESS, localLLMAddress);
  }, [localLLMAddress]);
  
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.IS_EMBEDDED_AT_LOCAL, isEmbeddedAtLocal);
  }, [isEmbeddedAtLocal]);
  
  useEffect(() => {
    if (provider === "openrouter") {
      fetchModelsFromServer("openrouter").then(models => {
        setOpenRouterModels(models);
        if (models.length > 0) {
          setModel(models[0].value);
        }
      });
    }
    
    if (provider === "local") {
      setIsEmbeddedAtLocal(true);
    }
  }, [provider]);
  
  
  /**
   * LocalLLMのモデルリストを手動で取得
   */
  const fetchLocalLLMModels = async () => {
    if (provider === "local" && localLLMAddress) {
      try {
        const models = await fetchModelsFromServer("local", localLLMAddress);
        setLocalLLMModels(models);
        if (models.length > 0) {
          setModel(models[0].value);
          toaster.create({
            type: "success",
            title: "モデルリスト取得成功",
            description: `${models.length}個のモデルを取得しました`,
          });
        } else {
          toaster.create({
            type: "warning",
            title: "モデルリスト取得警告",
            description: "モデルリストが空です。LocalLLMサーバーの設定を確認してください。",
          });
        }
        return true;
      } catch (error) {
        console.error("LocalLLMモデルの取得に失敗しました:", error);
        toaster.create({
          type: "error",
          title: "モデルリスト取得失敗",
          description: "LocalLLMからモデルリストの取得に失敗しました。接続設定とサーバーの状態を確認してください。",
        });
        return false;
      }
    }
    return false;
  };
  
  const providerConfigs: Record<Provider, ProviderConfig> = {
    openai: {
      models: OPENAI_MODELS,
      description: "OpenAI APIを使用します。OpenAIのAPIキーが必要です。"
    },
    azure: {
      models: OPENAI_MODELS, // Azureは同じモデルリストを使用
      description: "Azure OpenAI Serviceを使用します。Azureの設定が必要です。"
    },
    openrouter: {
      models: openRouterModels,
      description: "OpenRouterを使用して複数のモデルにアクセスします。（将来対応予定）"
    },
    local: {
      models: localLLMModels,
      description: "ローカルで実行されているLLMサーバーに接続します。（将来対応予定）",
      requiresConnection: true
    }
  };
  
  /**
   * プロバイダー変更時のハンドラー
   */
  const handleProviderChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as Provider;
    setProvider(newProvider);
    
    if (providerConfigs[newProvider].models.length > 0) {
      setModel(providerConfigs[newProvider].models[0].value);
    }
  };

  /**
   * ワーカー数変更時のハンドラー
   */
  const handleWorkersChange = (value: number) => {
    setWorkers(Math.max(1, Math.min(100, value)));
  };

  /**
   * ワーカー数増加ハンドラー
   */
  const increaseWorkers = () => {
    setWorkers((prev: number) => Math.min(100, prev + 1));
  };

  /**
   * ワーカー数減少ハンドラー
   */
  const decreaseWorkers = () => {
    setWorkers((prev: number) => Math.max(1, prev - 1));
  };

  /**
   * モデル変更時のハンドラー
   */
  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  /**
   * パブコムモード変更時のハンドラー
   */
  const handlePubcomModeChange = (checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") return;
    setIsPubcomMode(checked);
  };

  /**
   * モデル説明文を取得
   */
  const getModelDescription = () => {
    if (provider === "openai" || provider === "azure") {
      if (model === "gpt-4o-mini") {
        return "GPT-4o mini：最も安価に利用できるモデルです。価格の詳細はOpenAIが公開しているAPI料金のページをご参照ください。";
      } else if (model === "gpt-4o") {
        return "GPT-4o：gpt-4o-miniと比較して高性能なモデルです。性能は高くなりますが、gpt-4o-miniと比較してOpenAI APIの料金は高くなります。";
      } else if (model === "o3-mini") {
        return "o3-mini：gpt-4oよりも高度な推論能力を備えたモデルです。性能はより高くなりますが、gpt-4oと比較してOpenAI APIの料金は高くなります。";
      }
    }
    return "";
  };
  
  /**
   * プロバイダー説明文を取得
   */
  const getProviderDescription = () => {
    return providerConfigs[provider as Provider].description;
  };
  
  /**
   * 現在のプロバイダーのモデルリストを取得
   */
  const getCurrentModels = () => {
    return providerConfigs[provider as Provider].models;
  };
  
  /**
   * LocalLLM接続設定が必要かどうか
   */
  const requiresConnectionSettings = () => {
    return provider === "local";
  };
  
  /**
   * 埋め込み処理をサーバ内で行うの設定が無効化されるべきかどうか
   * LocalLLMプロバイダーの場合は常にtrueで無効化される
   */
  const isEmbeddedAtLocalDisabled = () => {
    return provider === "local";
  };
  /**
   * 要約処理をスキップするかどうか
   * trueでスキップされる
   */
  const [skipExtraction, setSkipExtraction] = useState(false);

    /**
   * ローカルエンベディングモデル
   */
  const LOCAL_EMBEDDING_MODELS = [
  { key: "mpnet", model_id: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2" },
  { key: "distiluse", model_id: "sentence-transformers/distiluse-base-multilingual-cased-v2" },
  { key: "minilm", model_id: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2" },
  { key: "xlmr", model_id: "sentence-transformers/paraphrase-xlm-r-multilingual-v1" },
  { key: "labse", model_id: "sentence-transformers/LaBSE" },
  { key: "retrieva", model_id: "sonoisa/sentence-bert-base-ja-mean-tokens" },
  { key: "ruri", model_id: "cl-nagoya/ruri-v3-310m" },
  { key: "plamo", model_id: "pfnet/plamo-embedding-1b" },
  { key: "rosetta", model_id: "pkshatech/RoSEtta-base-ja" },
  { key: "sarashina", model_id: "sbintuitions/sarashina-embedding-v1-1b" },
];
  const [localEmbeddingModel, setLocalEmbeddingModel] = useState<string>("");
  const getLocalEmbeddingModelOptions = () => {
  return LOCAL_EMBEDDING_MODELS.map((m) => ({
    value: m.model_id,
    label: m.model_id, // ラベル整形が必要ならここで行う
  }));
};
  /**
   * AI設定をリセット
   */
  const resetAISettings = () => {
    setProvider("openai");
    setModel("gpt-4o-mini");
    setWorkers(30);
    setIsPubcomMode(true);
    setIsEmbeddedAtLocal(false);
    setLocalLLMAddress(DEFAULT_LOCAL_LLM_ADDRESS);
    setOpenRouterModels([]);
    setLocalLLMModels([]);
    
    saveToStorage(STORAGE_KEYS.PROVIDER, "openai");
    saveToStorage(STORAGE_KEYS.MODEL, "gpt-4o-mini");
    saveToStorage(STORAGE_KEYS.WORKERS, 30);
    saveToStorage(STORAGE_KEYS.LOCAL_LLM_ADDRESS, DEFAULT_LOCAL_LLM_ADDRESS);
    saveToStorage(STORAGE_KEYS.IS_EMBEDDED_AT_LOCAL, false);
  };

  return {
    provider,
    model,
    workers,
    isPubcomMode,
    isEmbeddedAtLocal,
    localLLMAddress,
    handleProviderChange,
    handleModelChange,
    handleWorkersChange,
    increaseWorkers,
    decreaseWorkers,
    handlePubcomModeChange,
    setLocalLLMAddress,
    getModelDescription,
    getProviderDescription,
    getCurrentModels,
    requiresConnectionSettings,
    isEmbeddedAtLocalDisabled,
    resetAISettings,
    setIsEmbeddedAtLocal,
    fetchLocalLLMModels,
    localEmbeddingModel,
    setLocalEmbeddingModel,
    getLocalEmbeddingModelOptions,
    skipExtraction,
    setSkipExtraction,
  };
}
