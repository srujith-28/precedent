from unittest.mock import patch
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Precedent API is running"}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_outcome_route():
    with patch("app.main.retain_memory") as mock_retain:
        mock_retain.return_value = {"status": "stored"}
        payload = {
            "case_id": "CB-001",
            "outcome": "LOST",
            "actual_result": "Arbitrator ruled in cardholder favor",
            "lesson": "Lacked cancellation request timestamp logs",
        }
        response = client.post("/outcome", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "stored"
        assert data["case_id"] == "CB-001"
        assert data["message"] == "Outcome stored in Hindsight."
        mock_retain.assert_called_once()


def test_analyze_route():
    payload = {
        "case_id": "CB-002",
        "dispute_type": "Subscription",
        "amount": 129.99,
        "customer_claim": "Customer claims cancellation before renewal.",
        "merchant_evidence": "generic transaction receipt and account activity.",
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "CB-002"
    assert data["dispute_type"] == "Subscription"
    assert "recommendation" in data
    assert "confidence" in data
    assert "reasoning" in data
    assert "evidence_to_submit" in data
    assert "decision" in data
    assert data["decision"]["recommendation"] in ("FIGHT", "FOLD", "REVIEW")
