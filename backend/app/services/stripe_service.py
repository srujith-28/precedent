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


def get_stripe_publishable_key() -> str:
    pk = (
        os.getenv("STRIPE_PUBLISHABLE_KEY", "").strip()
        or os.getenv("VITE_STRIPE_PUBLISHABLE_KEY", "").strip()
    )
    if not pk or "your_stripe" in pk:
        pk = "pk_test_51UOthHHoPoB7rpEf5boSwkDVop1DAuTu7n334lhmFuuJ3BV6WrhKhKj4dkV0BvrbAVh047gYyWtSkPNmgqWMHd9k00cR1YapWo"
    return pk


def get_stripe_status() -> Dict[str, Any]:
    key = get_stripe_secret_key()
    wh_secret = get_stripe_webhook_secret()
    pk = get_stripe_publishable_key()

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
        "publishable_key_configured": bool(pk),
        "publishable_key": pk if pk else None,
        "webhook_secret_configured": bool(wh_secret),
        "google_pay_supported": True,
        "total_events_processed": get_event_count(),
    }


def create_payment_intent(
    amount_cents: int,
    currency: str = "usd",
    customer_name: Optional[str] = None,
    customer_email: Optional[str] = None,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, str]] = None,
    payment_method_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates a Stripe PaymentIntent with automatic payment methods (supporting Google Pay & Cards).
    Persists to durable SQLite store.
    """
    if amount_cents < 50:
        raise ValueError("Amount must be at least 50 cents ($0.50)")
    if amount_cents > 10_000_000:
        raise ValueError("Amount exceeds maximum transaction limit ($100,000)")

    client = init_stripe_client()
    meta = metadata.copy() if metadata else {}
    if customer_name:
        meta["customer_name"] = customer_name
    if customer_email:
        meta["customer_email"] = customer_email
    if payment_method_type:
        meta["payment_channel"] = payment_method_type

    try:
        pi = client.PaymentIntent.create(
            amount=amount_cents,
            currency=currency.lower(),
            description=description or f"Precedent Payment ({customer_name or 'Customer'})",
            automatic_payment_methods={"enabled": True},
            metadata=meta,
        )

        # Store in durable SQLite store
        upsert_payment_record(
            payment_id=pi.get("id"),
            amount=pi.get("amount"),
            currency=pi.get("currency"),
            status=pi.get("status"),
            customer_id=customer_email or customer_name or "customer_checkout",
            created_at=pi.get("created"),
            payload={
                "id": pi.get("id"),
                "amount": pi.get("amount"),
                "currency": pi.get("currency"),
                "status": pi.get("status"),
                "description": pi.get("description"),
                "customer_name": customer_name,
                "customer_email": customer_email,
            },
        )

        return {
            "id": pi.get("id"),
            "client_secret": pi.get("client_secret"),
            "amount": pi.get("amount", 0) / 100.0,
            "amount_cents": pi.get("amount"),
            "currency": pi.get("currency"),
            "status": pi.get("status"),
            "description": pi.get("description"),
            "publishable_key": get_stripe_publishable_key(),
        }
    except Exception as e:
        raise RuntimeError(f"Stripe API error creating PaymentIntent: {str(e)}")


def retrieve_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
    """
    Retrieves authoritative PaymentIntent state from Stripe.
    """
    client = init_stripe_client()
    try:
        pi = client.PaymentIntent.retrieve(payment_intent_id)
        # Update local durable record
        upsert_payment_record(
            payment_id=pi.get("id"),
            amount=pi.get("amount"),
            currency=pi.get("currency"),
            status=pi.get("status"),
            customer_id=pi.get("customer") or "customer_checkout",
            created_at=pi.get("created"),
            payload={
                "id": pi.get("id"),
                "amount": pi.get("amount"),
                "currency": pi.get("currency"),
                "status": pi.get("status"),
                "description": pi.get("description"),
            },
        )

        return {
            "id": pi.get("id"),
            "amount": pi.get("amount", 0) / 100.0 if pi.get("amount") is not None else None,
            "amount_cents": pi.get("amount"),
            "currency": pi.get("currency"),
            "status": pi.get("status"),
            "description": pi.get("description"),
            "created": pi.get("created"),
            "charges": [
                {
                    "id": ch.get("id"),
                    "paid": ch.get("paid"),
                    "status": ch.get("status"),
                    "payment_method_details": ch.get("payment_method_details"),
                }
                for ch in getattr(pi.get("charges", {}), "data", [])
            ] if isinstance(pi.get("charges"), dict) or hasattr(pi.get("charges"), "data") else [],
        }
    except stripe.InvalidRequestError:
        raise KeyError(f"PaymentIntent {payment_intent_id} not found")
    except Exception as e:
        raise RuntimeError(f"Stripe API error retrieving PaymentIntent: {str(e)}")


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
