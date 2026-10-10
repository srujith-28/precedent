import os
from dotenv import load_dotenv

load_dotenv()

HINDSIGHT_BASE_URL = os.getenv("HINDSIGHT_BASE_URL")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID")

client = None
try:
    if HINDSIGHT_BASE_URL and HINDSIGHT_API_KEY:
        from hindsight_client import Hindsight
        client = Hindsight(
            base_url=HINDSIGHT_BASE_URL,
            api_key=HINDSIGHT_API_KEY,
        )
except Exception:
    client = None


def retain_memory(content: str):
    if not client or not HINDSIGHT_BANK_ID:
        return {"status": "skipped", "message": "Hindsight not configured"}
    try:
        return client.retain(
            bank_id=HINDSIGHT_BANK_ID,
            content=content,
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}


def recall_memories(query: str):
    class EmptyResults:
        results = []

    if not client or not HINDSIGHT_BANK_ID:
        return EmptyResults()
    try:
        return client.recall(
            bank_id=HINDSIGHT_BANK_ID,
            query=query,
        )
    except Exception:
        return EmptyResults()
