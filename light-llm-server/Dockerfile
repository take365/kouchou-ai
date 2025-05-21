FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# モデル自動取得（この行を追加）
RUN apt-get update && apt-get install -y wget && \
    mkdir -p models && \
    wget -O models/gemma-3-1B-it-QAT-Q4_0.gguf \
        "https://huggingface.co/lmstudio-community/gemma-3-1B-it-qat-GGUF/resolve/main/gemma-3-1B-it-QAT-Q4_0.gguf?download=true"
COPY app/ app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "11434"]

