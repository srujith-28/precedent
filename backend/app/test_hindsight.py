from app.services.hindsight import retain_memory, recall_memories

print("1. Storing test memory...")

retain_memory(
    """
    Precedent test case:
    A subscription chargeback was lost because the merchant submitted
    only a generic transaction receipt without cancellation evidence.
    The lesson is to include cancellation records and customer communication
    when available.
    """
)

print("2. Memory stored.")

print("3. Recalling memory...")

result = recall_memories(
    "What evidence should Precedent use when defending a subscription chargeback?"
)

print("4. Recall results:")

for memory in result.results:
    print(f"- [{memory.type}] {memory.text}")