from openai import OpenAI

client = OpenAI(
#    base_url="http://localhost:11434/v1",
    base_url="https://app-812c526a-fbed-44ef-8359-31fbbae08513.ingress.apprun.sakura.ne.jp/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="gemma-3-1b",
    messages=[
        {"role": "system", "content": "あなたはフレンドリーなAIです。"},
        {"role": "user", "content": "こんにちは、自己紹介して！"}
    ],
    temperature=0.7,
    max_tokens=512,
)

print(response.choices[0].message.content)