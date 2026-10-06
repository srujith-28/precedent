import json
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set")

client = Groq(api_key=GROQ_API_KEY)


def parse_groq_json(content: str) -> dict:
    """
    Safely parse JSON from Groq response, handling markdown fences,
    extraneous text, and returning a structured fallback if decoding fails.
    """
    if not content or not isinstance(content, str):
        return {}

    cleaned = content.strip()

    # Strip markdown code blocks (e.g. ```json ... ```)
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Fallback: locate first { and last }
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        try:
            parsed = json.loads(cleaned[start_idx : end_idx + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    return {
        "recommendation": "REVIEW",
        "confidence": 50,
        "evidence_to_submit": [],
        "reasoning": cleaned,
        "memory_used": False,
    }


def generate_decision(case, memories) -> dict:

    precedent_text = "\n\n".join(
        f"[{memory.type}] {memory.text}"
        for memory in memories.results
    )

    prompt = f"""
You are Precedent, an AI chargeback analyst.

Your job is to analyze a merchant chargeback using:
1. The current dispute
2. Previous chargeback experiences recalled from long-term memory

CURRENT CASE:
Case ID: {case.case_id}
Dispute type: {case.dispute_type}
Amount: ${case.amount}
Customer claim: {case.customer_claim}
Merchant evidence: {case.merchant_evidence}

RELEVANT PRECEDENT FROM MEMORY:
{precedent_text}

Based on the current case and the previous precedent, provide a
practical recommendation.

Return ONLY valid JSON with this structure:

{{
  "recommendation": "FIGHT or FOLD",
  "confidence": 0-100,
  "evidence_to_submit": [
    "evidence item 1",
    "evidence item 2"
  ],
  "reasoning": "short explanation",
  "memory_used": "explain how previous experience influenced the decision"
}}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are a careful chargeback analysis assistant. Return only valid JSON.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.2,
    )

    raw_content = response.choices[0].message.content
    return parse_groq_json(raw_content)