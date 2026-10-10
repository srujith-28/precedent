import os
import time
import json
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# In-memory sandbox storage for Stripe test mode records and webhook events
PROCESSED_EVENT_IDS: set = set()
WEBHOOK_EVENT_LOG: List[Dict[str, Any]] = []

# Initial test mode data (clearly marked as sandbox data)
INITIAL_TEST_PAYMENTS: List[Dict[str, Any]] = [
    {
        "id": "pi_3Ptest001SubCapture",
        "amount": 149.00,
        "amount_cents": 14900,
        "currency": "usd",
        "status": "succeeded",
        "created": int(time.time()) - 86400 * 4,
        "customer_id": "cus_test_alex_99",
        "customer_email": "alex.m@example.com",
        "customer_name": "Alex Mercer",
        "description": "CloudPro Annual SaaS Tier Renewal",
        "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_001",
        "card_brand": "Visa",
        "card_last4": "4242",
        "disputed": True,
        "dispute_id": "dp_1Ptest_sub_cancellation_001",
        "radar_risk_score": 12,
        "radar_risk_level": "normal",
        "is_sandbox": True,
    },
    {
        "id": "pi_3Ptest002DeviceDelivery",
        "amount": 420.00,
        "amount_cents": 42000,
        "currency": "usd",
        "status": "succeeded",
        "created": int(time.time()) - 86400 * 6,
        "customer_id": "cus_test_elena_44",
        "customer_email": "elena.k@example.com",
        "customer_name": "Elena Kovacs",
        "description": "Hardware Security Key Enterprise Pack (2x)",
        "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_002",
        "card_brand": "Mastercard",
        "card_last4": "5556",
        "disputed": True,
        "dispute_id": "dp_1Ptest_pnr_delivery_002",
        "radar_risk_score": 25,
        "radar_risk_level": "normal",
        "is_sandbox": True,
    },
    {
        "id": "pi_3Ptest003FraudClaim",
        "amount": 290.00,
        "amount_cents": 29000,
        "currency": "usd",
        "status": "succeeded",
        "created": int(time.time()) - 86400 * 2,
        "customer_id": "cus_test_jordan_12",
        "customer_email": "jordan.b@example.com",
        "customer_name": "Jordan Bell",
        "description": "API Seat Add-on License",
        "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_003",
        "card_brand": "Visa",
        "card_last4": "1881",
        "disputed": True,
        "dispute_id": "dp_1Ptest_fraud_account_003",
        "radar_risk_score": 68,
        "radar_risk_level": "elevated",
        "is_sandbox": True,
    },
    {
        "id": "pi_3Ptest004ActiveGood",
        "amount": 89.00,
        "amount_cents": 8900,
        "currency": "usd",
        "status": "succeeded",
        "created": int(time.time()) - 86400 * 1,
        "customer_id": "cus_test_sara_88",
        "customer_email": "sara.t@example.com",
        "customer_name": "Sara Tanaka",
        "description": "Monthly Workspace Seat Tier",
        "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_004",
        "card_brand": "Amex",
        "card_last4": "0005",
        "disputed": False,
        "dispute_id": None,
        "radar_risk_score": 4,
        "radar_risk_level": "normal",
        "is_sandbox": True,
    },
]

INITIAL_TEST_DISPUTES: List[Dict[str, Any]] = [
    {
        "id": "dp_1Ptest_sub_cancellation_001",
        "amount": 149.00,
        "amount_cents": 14900,
        "currency": "usd",
        "reason": "subscription_canceled",
        "status": "needs_response",
        "created": int(time.time()) - 86400 * 2,
        "evidence_due_by": int(time.time()) + 86400 * 12,
        "charge_id": "ch_3Ptest001SubCapture",
        "payment_intent_id": "pi_3Ptest001SubCapture",
        "is_sandbox": True,
        "customer_claim": "Cardholder claims they canceled subscription prior to renewal and requested refund through email.",
        "connected_evidence": {
            "card_brand": "Visa",
            "card_last4": "4242",
            "card_funding": "credit",
            "card_country": "US",
            "billing_postal_code": "94107",
            "avs_postal_match": True,
            "cvc_check": "pass",
            "customer_email": "alex.m@example.com",
            "customer_name": "Alex Mercer",
            "customer_purchase_ip": "198.51.100.42",
            "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_001",
            "payment_created": int(time.time()) - 86400 * 4,
            "product_description": "CloudPro Annual SaaS Tier Renewal",
            "subscription_interval": "year",
            "service_start_date": "2025-10-01",
            "prior_transactions_count": 2,
            "radar_risk_score": 12,
            "radar_risk_level": "normal",
        },
        "missing_evidence_from_sources": [
            "Customer support chat log / email correspondence verifying cancellation request timing",
            "Cancellation terms acknowledgment during signup / checkout click-wrap",
            "Account login audit logs proving active software consumption after alleged cancellation date",
        ],
        "merchant_supplied_evidence": "Automated renewal receipt and billing invoice. Terms of Service URL attached.",
        "represented": False,
        "represented_at": None,
        "outcome_recorded": False,
        "final_outcome": None,
        "actual_result": None,
        "lesson_learned": None,
        "hindsight_analysis": None,
    },
    {
        "id": "dp_1Ptest_pnr_delivery_002",
        "amount": 420.00,
        "amount_cents": 42000,
        "currency": "usd",
        "reason": "product_not_received",
        "status": "needs_response",
        "created": int(time.time()) - 86400 * 3,
        "evidence_due_by": int(time.time()) + 86400 * 9,
        "charge_id": "ch_3Ptest002DeviceDelivery",
        "payment_intent_id": "pi_3Ptest002DeviceDelivery",
        "is_sandbox": True,
        "customer_claim": "Cardholder states physical security keys package never arrived at their shipping address.",
        "connected_evidence": {
            "card_brand": "Mastercard",
            "card_last4": "5556",
            "card_funding": "credit",
            "card_country": "US",
            "billing_postal_code": "10001",
            "avs_postal_match": True,
            "cvc_check": "pass",
            "customer_email": "elena.k@example.com",
            "customer_name": "Elena Kovacs",
            "customer_purchase_ip": "203.0.113.19",
            "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_002",
            "payment_created": int(time.time()) - 86400 * 6,
            "product_description": "Hardware Security Key Enterprise Pack (2x)",
            "subscription_interval": "one_time",
            "prior_transactions_count": 0,
            "radar_risk_score": 25,
            "radar_risk_level": "normal",
        },
        "missing_evidence_from_sources": [
            "Carrier tracking number and delivery GPS / photo confirmation showing delivery to customer address",
            "Customer signature upon physical package receipt",
        ],
        "merchant_supplied_evidence": "Warehouse shipping manifest and FedEx tracking number 7948291039.",
        "represented": False,
        "represented_at": None,
        "outcome_recorded": False,
        "final_outcome": None,
        "actual_result": None,
        "lesson_learned": None,
        "hindsight_analysis": None,
    },
    {
        "id": "dp_1Ptest_fraud_account_003",
        "amount": 290.00,
        "amount_cents": 29000,
        "currency": "usd",
        "reason": "fraudulent",
        "status": "needs_response",
        "created": int(time.time()) - 86400 * 1,
        "evidence_due_by": int(time.time()) + 86400 * 14,
        "charge_id": "ch_3Ptest003FraudClaim",
        "payment_intent_id": "pi_3Ptest003FraudClaim",
        "is_sandbox": True,
        "customer_claim": "Cardholder asserts this transaction was unauthorized and their card credentials were compromised.",
        "connected_evidence": {
            "card_brand": "Visa",
            "card_last4": "1881",
            "card_funding": "credit",
            "card_country": "US",
            "billing_postal_code": "60601",
            "avs_postal_match": False,
            "cvc_check": "pass",
            "customer_email": "jordan.b@example.com",
            "customer_name": "Jordan Bell",
            "customer_purchase_ip": "198.51.100.99",
            "receipt_url": "https://pay.stripe.com/receipts/test_rcpt_003",
            "payment_created": int(time.time()) - 86400 * 2,
            "product_description": "API Seat Add-on License",
            "subscription_interval": "month",
            "prior_transactions_count": 1,
            "radar_risk_score": 68,
            "radar_risk_level": "elevated",
        },
        "missing_evidence_from_sources": [
            "Cardholder device fingerprint matching historical legitimate sessions",
            "2-Factor Authentication (2FA) verification timestamp log",
            "IP geolocation matching known cardholder billing address",
        ],
        "merchant_supplied_evidence": "API token generation logs showing usage 10 minutes post-checkout.",
        "represented": False,
        "represented_at": None,
        "outcome_recorded": False,
        "final_outcome": None,
        "actual_result": None,
        "lesson_learned": None,
        "hindsight_analysis": None,
    },
]

# Mutable store for the active session
test_payments_store = list(INITIAL_TEST_PAYMENTS)
test_disputes_store = list(INITIAL_TEST_DISPUTES)


def get_stripe_status() -> Dict[str, Any]:
    has_secret_key = bool(STRIPE_SECRET_KEY and STRIPE_SECRET_KEY.startswith("sk_test_"))
    has_webhook_secret = bool(STRIPE_WEBHOOK_SECRET and STRIPE_WEBHOOK_SECRET.startswith("whsec_"))

    mode = "test_live_key" if has_secret_key else "test_sandbox_fallback"

    needs_response_count = sum(
        1 for d in test_disputes_store if d.get("status") in ("needs_response", "warning_needs_response")
    )

    return {
        "connected": has_secret_key or True,  # Available in test sandbox or live test key
        "mode": mode,
        "livemode": False,
        "secret_key_configured": has_secret_key,
        "webhook_secret_configured": has_webhook_secret,
        "key_prefix": STRIPE_SECRET_KEY[:12] + "..." if has_secret_key else "sandbox_demo",
        "total_payments": len(test_payments_store),
        "total_disputes": len(test_disputes_store),
        "needs_response_count": needs_response_count,
        "webhook_events_count": len(WEBHOOK_EVENT_LOG),
        "message": (
            "Connected to Stripe Test Mode via API Key"
            if has_secret_key
            else "Running in Stripe Sandbox Test Mode (Set STRIPE_SECRET_KEY in environment for live Stripe API connection)"
        ),
    }


def list_stripe_payments() -> List[Dict[str, Any]]:
    return sorted(test_payments_store, key=lambda x: x.get("created", 0), reverse=True)


def list_stripe_disputes() -> List[Dict[str, Any]]:
    return sorted(test_disputes_store, key=lambda x: x.get("created", 0), reverse=True)


def get_stripe_dispute(dispute_id: str) -> Optional[Dict[str, Any]]:
    for d in test_disputes_store:
        if d.get("id") == dispute_id:
            return d
    return None


def record_webhook_event(event_id: str, event_type: str, verified: bool, summary: str, data_id: str) -> Dict[str, Any]:
    entry = {
        "id": event_id,
        "type": event_type,
        "created": int(time.time()),
        "livemode": False,
        "verified": bool(verified),
        "signature_checked": bool(verified),
        "status": "processed",
        "summary": summary,
        "data_object_id": data_id,
    }
    WEBHOOK_EVENT_LOG.insert(0, entry)
    PROCESSED_EVENT_IDS.add(event_id)
    return entry
