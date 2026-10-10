import os
from typing import Any, Dict, List, Optional
import stripe
from dotenv import load_dotenv

from app.services.event_store import (
    get_event_count,
    record_event_atomically,
    upsert_dispute_record,
    upsert_payment_record,
)

load_dotenv()

SUPPORTED_EVENT_TYPES = {
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "charge.dispute.created",
    "charge.dispute.closed",
}


def get_stripe_secret_key() -> str:
    key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    return key


def get_stripe_webhook_secret() -> str:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    return secret


def init_stripe_client() -> stripe:
    key = get_stripe_secret_key()
    if not key:
        raise ValueError("STRIPE_SECRET_KEY is not configured")
    stripe.api_key = key
    return stripe


def get_stripe_status() -> Dict[str, Any]:
    key = get_stripe_secret_key()
    wh_secret = get_stripe_webhook_secret()

    configured = bool(key)
    mode = "unconfigured"
    if key.startswith("sk_test_"):
        mode = "test"
    elif key.startswith("sk_live_"):
        mode = "live"
    elif configured:
        mode = "custom"

    return {
        "connected": configured,
        "mode": mode,
        "secret_key_configured": configured,
        "webhook_secret_configured": bool(wh_secret),
        "total_events_processed": get_event_count(),
    }


def list_stripe_payments(limit: int = 20) -> List[Dict[str, Any]]:
    client = init_stripe_client()
    try:
        payment_intents = client.PaymentIntent.list(limit=limit)
        results = []
        for pi in payment_intents.auto_paging_iter() if hasattr(payment_intents, "auto_paging_iter") else payment_intents.get("data", []):
            results.append({
                "id": pi.get("id"),
                "amount": pi.get("amount", 0) / 100.0 if pi.get("amount") is not None else None,
                "amount_cents": pi.get("amount"),
                "currency": pi.get("currency"),
                "status": pi.get("status"),
                "created": pi.get("created"),
                "customer": pi.get("customer"),
                "description": pi.get("description"),
            })
            if len(results) >= limit:
                break
        return results
    except Exception as e:
        raise RuntimeError(f"Stripe API error listing payments: {str(e)}")


def list_stripe_disputes(limit: int = 20) -> List[Dict[str, Any]]:
    client = init_stripe_client()
    try:
        disputes = client.Dispute.list(limit=limit)
        results = []
        dispute_list = disputes.get("data", []) if isinstance(disputes, dict) or hasattr(disputes, "get") else getattr(disputes, "data", [])
        for d in dispute_list:
            results.append({
                "id": d.get("id"),
                "amount": d.get("amount", 0) / 100.0 if d.get("amount") is not None else None,
                "amount_cents": d.get("amount"),
                "currency": d.get("currency"),
                "status": d.get("status"),
                "reason": d.get("reason"),
                "charge": d.get("charge"),
                "payment_intent": d.get("payment_intent"),
                "created": d.get("created"),
                "evidence_due_by": d.get("evidence_details", {}).get("due_by") if d.get("evidence_details") else None,
            })
            if len(results) >= limit:
                break
        return results
    except Exception as e:
        raise RuntimeError(f"Stripe API error listing disputes: {str(e)}")


def get_stripe_dispute(dispute_id: str) -> Dict[str, Any]:
    client = init_stripe_client()
    try:
        d = client.Dispute.retrieve(dispute_id)
        return {
            "id": d.get("id"),
            "amount": d.get("amount", 0) / 100.0 if d.get("amount") is not None else None,
            "amount_cents": d.get("amount"),
            "currency": d.get("currency"),
            "status": d.get("status"),
            "reason": d.get("reason"),
            "charge": d.get("charge"),
            "payment_intent": d.get("payment_intent"),
            "created": d.get("created"),
            "evidence_due_by": d.get("evidence_details", {}).get("due_by") if d.get("evidence_details") else None,
            "evidence": d.get("evidence"),
        }
    except stripe.InvalidRequestError:
        raise KeyError(f"Dispute {dispute_id} not found on Stripe")
    except Exception as e:
        raise RuntimeError(f"Stripe API error retrieving dispute: {str(e)}")


def to_clean_dict(obj: Any) -> Any:
    if hasattr(obj, "to_dict_recursive"):
        return obj.to_dict_recursive()
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if isinstance(obj, dict):
        return {k: to_clean_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_clean_dict(i) for i in obj]
    return obj


def process_webhook_event_payload(event: Any) -> Dict[str, Any]:
    """
    Processes an authenticated Stripe event dictionary.
    Guarantees idempotency via durable SQLite store.
    Extracts available data safely without hallucinating missing fields.
    Does NOT call Hindsight or automatically submit dispute representment.
    """
    event_dict = to_clean_dict(event) if not isinstance(event, dict) else event

    event_id = event_dict.get("id")
    event_type = event_dict.get("type", "unknown")
    created_at = event_dict.get("created")
    data_object = event_dict.get("data", {}).get("object", {})
    if not isinstance(data_object, dict) and hasattr(data_object, "to_dict"):
        data_object = data_object.to_dict()
    data_object_id = data_object.get("id")

    summary = f"Received Stripe event {event_type} for object {data_object_id}"
    if event_type == "payment_intent.succeeded":
        amt = data_object.get("amount")
        curr = data_object.get("currency", "").upper()
        summary = f"PaymentIntent {data_object_id} succeeded ({amt / 100.0 if amt else 0:.2f} {curr})"
    elif event_type == "payment_intent.payment_failed":
        summary = f"PaymentIntent {data_object_id} failed"
    elif event_type == "charge.dispute.created":
        reason = data_object.get("reason")
        summary = f"Dispute {data_object_id} created (reason: {reason})"
    elif event_type == "charge.dispute.closed":
        status = data_object.get("status")
        summary = f"Dispute {data_object_id} closed with status: {status}"

    # Atomic durable idempotency check & record
    is_new = record_event_atomically(
        event_id=event_id,
        event_type=event_type,
        created_at=created_at,
        data_object_id=data_object_id,
        status="processed",
        summary=summary,
        payload=event_dict,
    )

    if not is_new:
        return {
            "status": "duplicate_skipped",
            "event_id": event_id,
            "event_type": event_type,
            "message": "Webhook event was already processed idempotently.",
        }

    # Extract and persist business entities to durable store
    if event_type in ("payment_intent.succeeded", "payment_intent.payment_failed"):
        upsert_payment_record(
            payment_id=data_object_id,
            amount=data_object.get("amount"),
            currency=data_object.get("currency"),
            status=data_object.get("status"),
            customer_id=data_object.get("customer"),
            created_at=data_object.get("created"),
            payload=data_object,
        )
    elif event_type in ("charge.dispute.created", "charge.dispute.closed"):
        upsert_dispute_record(
            dispute_id=data_object_id,
            amount=data_object.get("amount"),
            currency=data_object.get("currency"),
            status=data_object.get("status"),
            reason=data_object.get("reason"),
            charge_id=data_object.get("charge"),
            payment_intent_id=data_object.get("payment_intent"),
            created_at=data_object.get("created"),
            payload=data_object,
        )

    return {
        "status": "processed",
        "event_id": event_id,
        "event_type": event_type,
        "summary": summary,
        "data_object_id": data_object_id,
    }
