from fastapi import FastAPI
from pydantic import BaseModel

from app.services.hindsight import recall_memories, retain_memory
from app.services.decision import make_decision
from app.services.groq import generate_decision
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Precedent API",
    description="AI-powered chargeback intelligence agent",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChargebackCase(BaseModel):
    case_id: str
    dispute_type: str
    amount: float
    customer_claim: str
    merchant_evidence: str
class ChargebackOutcome(BaseModel):
    case_id: str
    outcome: str
    actual_result: str
    lesson: str

@app.get("/")
def root():
    return {
        "message": "Precedent API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/analyze")
def analyze_case(case: ChargebackCase):

    query = f"""
    Chargeback dispute:
    Type: {case.dispute_type}
    Customer claim: {case.customer_claim}
    Merchant evidence: {case.merchant_evidence}

    Find relevant previous chargeback experiences,
    outcomes, evidence strategies, and lessons.
    """

    memories = recall_memories(query)
    ai_decision = generate_decision(case, memories)
    return {
    "case_id": case.case_id,
    "dispute_type": case.dispute_type,
    "amount": case.amount,
    "decision": ai_decision,
    "memories": [
        {
            "type": memory.type,
            "text": memory.text,
        }
        for memory in memories.results
    ],
}
@app.post("/outcome")
def record_outcome(outcome: ChargebackOutcome):

    memory = f"""
    Precedent chargeback outcome:

    Case ID: {outcome.case_id}
    Outcome: {outcome.outcome}
    Actual result: {outcome.actual_result}
    Lesson learned: {outcome.lesson}

    This outcome should be used as precedent for future similar
    chargeback decisions.
    """

    result = retain_memory(memory)

    return {
        "status": "stored",
        "case_id": outcome.case_id,
        "message": "Outcome stored in Hindsight.",
    }