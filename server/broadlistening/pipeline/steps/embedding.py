import pandas as pd
from services.llm import request_to_embed
from tqdm import tqdm


def embedding(config):
    model = config["embedding"]["model"]
    is_embedded_at_local = config["is_embedded_at_local"]
    local_model = config.get("local_embedding_model")

    dataset = config["output_dir"]
    path = f"outputs/{dataset}/embeddings.pkl"
    arguments = pd.read_csv(f"outputs/{dataset}/args.csv", usecols=["arg-id", "argument"])
    embeddings = []
    batch_size = 1000
    for i in tqdm(range(0, len(arguments), batch_size)):
        args = arguments["argument"].tolist()[i : i + batch_size]
        embeds = request_to_embed(args, model, is_embedded_at_local, model_name=local_model)
        embeddings.extend(embeds)
    df = pd.DataFrame([{"arg-id": arguments.iloc[i]["arg-id"], "embedding": e} for i, e in enumerate(embeddings)])
    df.to_pickle(path)
