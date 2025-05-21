from typing import List, Literal, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from llama_cpp import Llama
from pydantic import BaseModel

llm = Llama(
    model_path="models/gemma-3-1B-it-QAT-Q4_0.gguf",
    n_ctx=2048,
    n_threads=4
)

app = FastAPI()

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024

@app.post("/v1/chat/completions")
async def chat_endpoint(request: ChatRequest):
    # ユーザーメッセージを結合
    prompt = "\n".join([f"{m.role}: {m.content}" for m in request.messages])
    
    output = llm(prompt, max_tokens=request.max_tokens)
    text = output["choices"][0]["text"].strip()

    return {
        "id": "chatcmpl-xyz",
        "object": "chat.completion",
        "model": request.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": text,
                },
                "finish_reason": "stop"
            }
        ]
    }
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    response = llm(prompt, max_tokens=256, stop=["</s>"])
    return {"response": response["choices"][0]["text"]}



@app.get("/v1/models")
async def list_models():
    return JSONResponse(
        content={
            "object": "list",
            "data": [
                {
                    "id": "gemma-3-1B-it-QAT-Q4_0.gguf",
                    "object": "model",
                }
            ]
        }
    )
    