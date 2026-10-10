# Precedent — Chargeback Intelligence Backend (FastAPI)

FastAPI service powering Precedent's chargeback dispute evaluation, persistent memory recall via Hindsight, and Stripe test-mode dispute ingestion.

## Dependencies

The backend requires Python 3.10+ and the following packages:

- `fastapi`
- `uvicorn`
- `pydantic`
- `stripe` (Official Python SDK)
- `hindsight-client`
- `groq`
- `python-dotenv`
- `pytest`
- `httpx`

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and supply your credentials:

- `STRIPE_SECRET_KEY`: Stripe test secret key (`sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: Stripe test webhook signing secret (`whsec_...`).
- `HINDSIGHT_API_KEY`: Hindsight API key for long-term dispute pattern memory.
- `HINDSIGHT_BANK_ID`: Bank ID for dispute memory bank.
- `HINDSIGHT_BASE_URL`: Base URL for Hindsight API (`https://api.hindsight.vectorize.io`).
- `GROQ_API_KEY`: Groq API key for LLM analysis.
- `STRIPE_EVENTS_DB_PATH`: Optional path for durable SQLite event store (defaults to `backend/data/stripe_events.db`).

## Running the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests

```bash
pytest backend/tests/ -v
```

## Available Endpoints

### Core Chargeback & Hindsight Workflow
- `GET /`: Health status and welcome message.
- `GET /health`: Health probe endpoint.
- `POST /analyze`: Evaluates inbound dispute, recalls relevant Hindsight precedents, and generates calibrated recommendation.
- `POST /outcome`: Explicitly records confirmed dispute outcome (WON/LOST) and retains lessons in Hindsight long-term memory.

### Stripe Test-Mode Integration
- `POST /webhook/stripe`: Validates Stripe webhook signatures using the official SDK (`Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`). Atomically logs events into the durable SQLite store to guarantee idempotency across retries.
  - Handled events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`, `charge.dispute.closed`.
  - Event ingestion is strictly decoupled from Hindsight learning; payment events are never stored as lessons.
- `GET /stripe/status`: Returns current Stripe configuration status without exposing secrets.
- `GET /stripe/payments`: Fetches test payment intents via Stripe SDK (`STRIPE_SECRET_KEY` required).
- `GET /stripe/disputes`: Fetches test dispute records via Stripe SDK (`STRIPE_SECRET_KEY` required).
- `GET /stripe/disputes/{dispute_id}`: Retrieves specific dispute details from Stripe.
- `GET /stripe/webhooks`: Lists recent webhook events from the durable event store.
