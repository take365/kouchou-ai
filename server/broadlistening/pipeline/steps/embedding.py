import os

import pandas as pd
import tiktoken
from tqdm import tqdm

from services.llm import request_to_embed


def embedding(config):
    print("LOG_LEVEL =", os.getenv("LOG_LEVEL"))
    model = config["embedding"]["model"]
    is_embedded_at_local = config["is_embedded_at_local"]
    provider = config["provider"]
    api_key = None
    if provider == "openai":
        api_key = config.get("openai_api_key")
    elif provider == "openrouter":
        api_key = config.get("openrouter_api_key")
    dataset = config["output_dir"]
    path = f"outputs/{dataset}/embeddings.pkl"

    df = pd.read_csv(
        f"outputs/{dataset}/args.csv", usecols=["arg-id", "argument", "summary"]
    )
    use_summary = config.get("embedding", {}).get("use_summary", False)
    texts = df["summary"] if use_summary else df["argument"]
    arguments = texts.tolist()
    arg_ids = df["arg-id"].tolist()

    if not is_embedded_at_local:
        # https://platform.openai.com/docs/api-reference/embeddings/create
        # 8192トークン(llm.py）、配列2048次元、合計トークン数300,000を上限を配慮し余裕をもって制限する。
        tokenizer = tiktoken.encoding_for_model(model)
        MAX_TOTAL_TOKENS = 200_000
        MAX_BATCH_SIZE = 1000

        batches = []
        current_batch = []
        current_tokens = 0

        for arg in arguments:
            tokens = len(tokenizer.encode(arg))
            if (current_tokens + tokens > MAX_TOTAL_TOKENS) or (len(current_batch) >= MAX_BATCH_SIZE):
                batches.append(current_batch)
                current_batch = []
                current_tokens = 0
            current_batch.append(arg)
            current_tokens += tokens

        if current_batch:
            batches.append(current_batch)
    else:
        batches = [arguments]

    embeddings = []
    for batch in tqdm(batches, desc="Embedding batches"):
        embeds = request_to_embed(batch, model, is_embedded_at_local, provider, api_key=api_key)
        embeddings.extend(embeds)

    out_df = pd.DataFrame([{"arg-id": arg_ids[i], "embedding": embeddings[i]} for i in range(len(embeddings))])
    out_df.to_pickle(path)
