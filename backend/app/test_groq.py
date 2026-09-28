from app.services.groq import client

response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {
            "role": "user",
            "content": "Explain in one sentence what a chargeback is.",
        }
    ],
)

print(response.choices[0].message.content)