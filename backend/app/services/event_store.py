import json
import os
import sqlite3
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DEFAULT_DB_PATH = os.path.join(DB_DIR, "stripe_events.db")

_lock = threading.Lock()


def get_db_path() -> str:
    path = os.getenv("STRIPE_EVENTS_DB_PATH", DEFAULT_DB_PATH)
    dirname = os.path.dirname(path)
    if dirname and not os.path.exists(dirname):
        os.makedirs(dirname, exist_ok=True)
    return path


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock:
        conn = get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
                        event_id TEXT PRIMARY KEY,
                        event_type TEXT NOT NULL,
                        created_at INTEGER,
                        received_at TEXT NOT NULL,
                        data_object_id TEXT,
                        status TEXT NOT NULL,
                        summary TEXT,
                        payload TEXT
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS stripe_disputes (
                        dispute_id TEXT PRIMARY KEY,
                        amount INTEGER,
                        currency TEXT,
                        status TEXT,
                        reason TEXT,
                        charge_id TEXT,
                        payment_intent_id TEXT,
                        created_at INTEGER,
                        updated_at TEXT,
                        payload TEXT
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS stripe_payments (
                        payment_id TEXT PRIMARY KEY,
                        amount INTEGER,
                        currency TEXT,
                        status TEXT,
                        customer_id TEXT,
                        created_at INTEGER,
                        updated_at TEXT,
                        payload TEXT
                    )
                    """
                )
        finally:
            conn.close()


def is_event_processed(event_id: str) -> bool:
    with _lock:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM stripe_webhook_events WHERE event_id = ?",
                (event_id,),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()


def record_event_atomically(
    event_id: str,
    event_type: str,
    created_at: Optional[int],
    data_object_id: Optional[str],
    status: str,
    summary: str,
    payload: Dict[str, Any],
) -> bool:
    """
    Attempts to record an event atomically in the database.
    Returns True if newly inserted, False if duplicate event_id already exists.
    """
    received_at = datetime.utcnow().isoformat() + "Z"
    payload_str = json.dumps(payload)

    with _lock:
        conn = get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO stripe_webhook_events (
                        event_id, event_type, created_at, received_at,
                        data_object_id, status, summary, payload
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        event_type,
                        created_at,
                        received_at,
                        data_object_id,
                        status,
                        summary,
                        payload_str,
                    ),
                )
            return True
        except sqlite3.IntegrityError:
            # Duplicate event ID
            return False
        finally:
            conn.close()


def upsert_dispute_record(
    dispute_id: str,
    amount: Optional[int],
    currency: Optional[str],
    status: Optional[str],
    reason: Optional[str],
    charge_id: Optional[str],
    payment_intent_id: Optional[str],
    created_at: Optional[int],
    payload: Dict[str, Any],
):
    updated_at = datetime.utcnow().isoformat() + "Z"
    payload_str = json.dumps(payload)

    with _lock:
        conn = get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO stripe_disputes (
                        dispute_id, amount, currency, status, reason,
                        charge_id, payment_intent_id, created_at, updated_at, payload
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(dispute_id) DO UPDATE SET
                        amount = excluded.amount,
                        currency = excluded.currency,
                        status = excluded.status,
                        reason = excluded.reason,
                        charge_id = excluded.charge_id,
                        payment_intent_id = excluded.payment_intent_id,
                        updated_at = excluded.updated_at,
                        payload = excluded.payload
                    """,
                    (
                        dispute_id,
                        amount,
                        currency,
                        status,
                        reason,
                        charge_id,
                        payment_intent_id,
                        created_at,
                        updated_at,
                        payload_str,
                    ),
                )
        finally:
            conn.close()


def upsert_payment_record(
    payment_id: str,
    amount: Optional[int],
    currency: Optional[str],
    status: Optional[str],
    customer_id: Optional[str],
    created_at: Optional[int],
    payload: Dict[str, Any],
):
    updated_at = datetime.utcnow().isoformat() + "Z"
    payload_str = json.dumps(payload)

    with _lock:
        conn = get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO stripe_payments (
                        payment_id, amount, currency, status,
                        customer_id, created_at, updated_at, payload
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(payment_id) DO UPDATE SET
                        amount = excluded.amount,
                        currency = excluded.currency,
                        status = excluded.status,
                        customer_id = excluded.customer_id,
                        updated_at = excluded.updated_at,
                        payload = excluded.payload
                    """,
                    (
                        payment_id,
                        amount,
                        currency,
                        status,
                        customer_id,
                        created_at,
                        updated_at,
                        payload_str,
                    ),
                )
        finally:
            conn.close()


def get_event_count() -> int:
    with _lock:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM stripe_webhook_events")
            row = cursor.fetchone()
            return row[0] if row else 0
        finally:
            conn.close()


def list_webhook_events(limit: int = 50) -> List[Dict[str, Any]]:
    with _lock:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT event_id, event_type, created_at, received_at,
                       data_object_id, status, summary
                FROM stripe_webhook_events
                ORDER BY received_at DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()
