import hashlib
import hmac
import json
import os
import tempfile
import time
from unittest.mock import patch

import pytest
from starlette.testclient import TestClient

TEST_WEBHOOK_SECRET = "whsec_test_secret_1234567890abcdef"


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_events.db")
    monkeypatch.setenv("STRIPE_EVENTS_DB_PATH", db_path)
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake_key_12345")

    from app.services.event_store import init_db
    init_db()

    yield temp_dir


def generate_stripe_signature(payload: str, secret: str, timestamp: int = None) -> str:
    if timestamp is None:
        timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


def test_webhook_missing_secret(monkeypatch):
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    from app.main import app
    client = TestClient(app)

    payload = json.dumps({"id": "evt_test_1", "type": "payment_intent.succeeded"})
    response = client.post(
        "/webhook/stripe",
        content=payload,
        headers={"Stripe-Signature": "t=123,v1=abc"},
    )
    assert response.status_code == 500
    assert "STRIPE_WEBHOOK_SECRET" in response.json()["detail"]


def test_webhook_missing_signature():
    from app.main import app
    client = TestClient(app)

    payload = json.dumps({"id": "evt_test_2", "type": "payment_intent.succeeded"})
    response = client.post(
        "/webhook/stripe",
        content=payload,
    )
    assert response.status_code == 400
    assert "Missing Stripe-Signature header" in response.json()["detail"]


def test_webhook_invalid_signature():
    from app.main import app
    client = TestClient(app)

    payload = json.dumps({"id": "evt_test_3", "type": "payment_intent.succeeded"})
    bad_signature = "t=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000"
    response = client.post(
        "/webhook/stripe",
        content=payload,
        headers={"Stripe-Signature": bad_signature},
    )
    assert response.status_code == 400
    assert "signature verification failed" in response.json()["detail"].lower()


def test_webhook_payment_intent_succeeded():
    from app.main import app
    client = TestClient(app)

    event_payload = {
        "id": "evt_pi_succeeded_001",
        "object": "event",
        "type": "payment_intent.succeeded",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "pi_test_12345",
                "amount": 4900,
                "currency": "usd",
                "status": "succeeded",
                "customer": "cus_test_99",
            }
        },
    }
    raw_json = json.dumps(event_payload)
    sig = generate_stripe_signature(raw_json, TEST_WEBHOOK_SECRET)

    response = client.post(
        "/webhook/stripe",
        content=raw_json,
        headers={"Stripe-Signature": sig},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["event_id"] == "evt_pi_succeeded_001"
    assert data["data_object_id"] == "pi_test_12345"


def test_webhook_payment_intent_failed():
    from app.main import app
    client = TestClient(app)

    event_payload = {
        "id": "evt_pi_failed_002",
        "object": "event",
        "type": "payment_intent.payment_failed",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "pi_test_fail_678",
                "amount": 2500,
                "currency": "usd",
                "status": "requires_payment_method",
            }
        },
    }
    raw_json = json.dumps(event_payload)
    sig = generate_stripe_signature(raw_json, TEST_WEBHOOK_SECRET)

    response = client.post(
        "/webhook/stripe",
        content=raw_json,
        headers={"Stripe-Signature": sig},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["data_object_id"] == "pi_test_fail_678"


def test_webhook_charge_dispute_created():
    from app.main import app
    client = TestClient(app)

    event_payload = {
        "id": "evt_disp_created_003",
        "object": "event",
        "type": "charge.dispute.created",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "dp_test_dispute_001",
                "amount": 8900,
                "currency": "usd",
                "status": "needs_response",
                "reason": "subscription_canceled",
                "charge": "ch_test_charge_123",
                "payment_intent": "pi_test_12345",
            }
        },
    }
    raw_json = json.dumps(event_payload)
    sig = generate_stripe_signature(raw_json, TEST_WEBHOOK_SECRET)

    response = client.post(
        "/webhook/stripe",
        content=raw_json,
        headers={"Stripe-Signature": sig},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["data_object_id"] == "dp_test_dispute_001"


def test_webhook_charge_dispute_closed():
    from app.main import app
    client = TestClient(app)

    event_payload = {
        "id": "evt_disp_closed_004",
        "object": "event",
        "type": "charge.dispute.closed",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "dp_test_dispute_001",
                "amount": 8900,
                "currency": "usd",
                "status": "won",
                "reason": "subscription_canceled",
                "charge": "ch_test_charge_123",
            }
        },
    }
    raw_json = json.dumps(event_payload)
    sig = generate_stripe_signature(raw_json, TEST_WEBHOOK_SECRET)

    response = client.post(
        "/webhook/stripe",
        content=raw_json,
        headers={"Stripe-Signature": sig},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert "won" in data["summary"]


def test_webhook_idempotency_duplicate_event():
    from app.main import app
    client = TestClient(app)

    event_payload = {
        "id": "evt_idempotent_test_999",
        "object": "event",
        "type": "payment_intent.succeeded",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "pi_idemp_111",
                "amount": 1000,
                "currency": "usd",
                "status": "succeeded",
            }
        },
    }
    raw_json = json.dumps(event_payload)
    sig = generate_stripe_signature(raw_json, TEST_WEBHOOK_SECRET)

    # First delivery
    res1 = client.post(
        "/webhook/stripe",
        content=raw_json,
        headers={"Stripe-Signature": sig},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "processed"

    # Second delivery (Stripe retry)
    res2 = client.post(
        "/webhook/stripe",
        content=raw_json,
        headers={"Stripe-Signature": sig},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "duplicate_skipped"
    assert "already processed idempotently" in res2.json()["message"]


def test_webhook_does_not_call_hindsight():
    """Verify Stripe event ingestion never calls Hindsight retain_memory."""
    from app.main import app
    client = TestClient(app)

    event_payload = {
        "id": "evt_hindsight_check_001",
        "object": "event",
        "type": "charge.dispute.created",
        "created": int(time.time()),
        "data": {
            "object": {
                "id": "dp_check_001",
                "amount": 5000,
                "currency": "usd",
                "status": "needs_response",
                "reason": "fraudulent",
            }
        },
    }
    raw_json = json.dumps(event_payload)
    sig = generate_stripe_signature(raw_json, TEST_WEBHOOK_SECRET)

    with patch("app.main.retain_memory") as mock_retain:
        res = client.post(
            "/webhook/stripe",
            content=raw_json,
            headers={"Stripe-Signature": sig},
        )
        assert res.status_code == 200
        mock_retain.assert_not_called()
