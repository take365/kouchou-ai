"""
LLMモデルリスト取得サービス
"""

import httpx
from openai import OpenAI
from src.utils.logger import setup_logger

slogger = setup_logger()


class ModelOption:
    """モデルオプション"""

    def __init__(self, value: str, label: str):
        self.value = value
        self.label = label

    def to_dict(self) -> dict[str, str]:
        return {"value": self.value, "label": self.label}


OPENAI_MODELS = [
    ModelOption("gpt-4o-mini", "GPT-4o mini"),
    ModelOption("gpt-4o", "GPT-4o"),
    ModelOption("o3-mini", "o3-mini"),
]


async def get_openai_models() -> list[dict[str, str]]:
    """OpenAIのモデルリストを取得"""
    return [model.to_dict() for model in OPENAI_MODELS]


async def get_azure_models() -> list[dict[str, str]]:
    """Azureのモデルリストを取得（OpenAIと同じ）"""
    return [model.to_dict() for model in OPENAI_MODELS]


async def get_openrouter_models() -> list[dict[str, str]]:
    """OpenRouterのモデルリストをAPIから取得"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://openrouter.ai/api/v1/models")

            if response.status_code != 200:
                slogger.error(f"OpenRouter API error: {response.status_code}")
                raise ValueError("Failed to fetch models from OpenRouter API")

            data = response.json()

            if not data or not isinstance(data.get("data"), list):
                slogger.error("Invalid response format from OpenRouter API")
                raise ValueError("Invalid API response format")

            return [
                {
                    "value": model.get("id", ""),
                    "label": f"{model.get('provider', 'unknown')} - {model.get('name', model.get('id', 'unknown'))}",
                }
                for model in data["data"]
            ]
    except Exception as e:
        slogger.error(f"Error fetching OpenRouter models: {e}")
        raise ValueError(f"Failed to fetch models from OpenRouter API: {e}") from e


async def get_local_llm_models(address: str | None = None) -> list[dict[str, str]]:
    """LocalLLMのモデルリストをOpenAI互換APIから取得"""
    if not address:
        address = "localhost:11434"  # Ollamaのデフォルトポート

    if not address.startswith("http://") and not address.startswith("https://"):
        base_url = f"http://{address}/v1"
    else:
        # 最後に /v1 が含まれていなければ追加（あれば重複回避）
        base_url = address
        if not base_url.rstrip("/").endswith("/v1"):
            base_url = base_url.rstrip("/") + "/v1"

    try:
        client = OpenAI(
            base_url=base_url,
            api_key="not-needed",  # OllamaとLM Studioは認証不要
        )

        import asyncio

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, client.models.list)

        return [{"value": model.id, "label": model.id} for model in response.data]
    except Exception as e:
        slogger.error(f"Error fetching LocalLLM models: {e}")
        raise ValueError(f"Failed to fetch models from LocalLLM API: {e}") from e


async def get_models_by_provider(provider: str, address: str | None = None) -> list[dict[str, str]]:
    """プロバイダーに応じたモデルリストを取得"""
    if provider == "openai":
        return await get_openai_models()
    elif provider == "azure":
        return await get_azure_models()
    elif provider == "openrouter":
        return await get_openrouter_models()
    elif provider == "local":
        return await get_local_llm_models(address)
    else:
        raise ValueError(f"Unknown provider: {provider}")
