import os
import tempfile
from unittest.mock import patch

import pytest
from starlette.testclient import TestClient
import stripe


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_events.db")
    monkeypatch.setenv("STRIPE_EVENTS_DB_PATH", db_path)

    from app.services.event_store import init_db
    init_db()

    yield temp_dir


def test_stripe_status_configured(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_mock_12345")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_mock_99999")
    from app.main import app
    client = TestClient(app)

    res = client.get("/stripe/status")
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert data["mode"] == "test"
    assert data["secret_key_configured"] is True
    assert data["webhook_secret_configured"] is True
    assert "sk_test_mock_12345" not in str(data)
    assert "whsec_mock_99999" not in str(data)


def test_stripe_status_unconfigured(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    from app.main import app
    client = TestClient(app)

    res = client.get("/stripe/status")
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is False
    assert data["mode"] == "unconfigured"
    assert data["secret_key_configured"] is False
    assert data["webhook_secret_configured"] is False


def test_stripe_payments_missing_key(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    from app.main import app
    client = TestClient(app)

    res = client.get("/stripe/payments")
    assert res.status_code == 503
    assert "STRIPE_SECRET_KEY is not configured" in res.json()["detail"]


def test_stripe_disputes_missing_key(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    from app.main import app
    client = TestClient(app)

    res = client.get("/stripe/disputes")
    assert res.status_code == 503
    assert "STRIPE_SECRET_KEY is not configured" in res.json()["detail"]


def test_stripe_payments_success_mock(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_mock_123")
    from app.main import app
    client = TestClient(app)

    mock_payments = {
        "data": [
            {
                "id": "pi_mock_1",
                "amount": 14900,
                "currency": "usd",
                "status": "succeeded",
                "created": 1700000000,
                "customer": "cus_1",
                "description": "Subscription",
            }
        ]
    }

    with patch("stripe.PaymentIntent.list", return_value=mock_payments):
        res = client.get("/stripe/payments")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["payments"][0]["id"] == "pi_mock_1"
        assert data["payments"][0]["amount"] == 149.0


def test_stripe_disputes_success_mock(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_mock_123")
    from app.main import app
    client = TestClient(app)

    mock_disputes = {
        "data": [
            {
                "id": "dp_mock_1",
                "amount": 8900,
                "currency": "usd",
                "status": "needs_response",
                "reason": "subscription_canceled",
                "charge": "ch_mock_1",
                "created": 1700000000,
            }
        ]
    }

    with patch("stripe.Dispute.list", return_value=mock_disputes):
        res = client.get("/stripe/disputes")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["disputes"][0]["id"] == "dp_mock_1"
        assert data["disputes"][0]["amount"] == 89.0


def test_stripe_dispute_detail_not_found(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_mock_123")
    from app.main import app
    client = TestClient(app)

    with patch("stripe.Dispute.retrieve", side_effect=stripe.InvalidRequestError("No such dispute", "id")):
        res = client.get("/stripe/disputes/dp_nonexistent")
        assert res.status_code == 404
