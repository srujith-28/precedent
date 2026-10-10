import {
  StripeDispute,
  StripePayment,
  StripeStatus,
  StripeWebhookEvent,
} from '../types/stripe';
import { CaseAnalysisResult } from '../types/precedent';
import { getApiBaseUrl } from './api';

const headers = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

async function tryFetchJson<T>(path: string, options?: RequestInit): Promise<T | null> {
  // 1. Try relative path (Express server)
  try {
    const res = await fetch(path, { ...options, headers: { ...headers, ...options?.headers } });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Continue
  }

  // 2. Try with VITE_API_BASE_URL if configured
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    try {
      const cleanPath = path.startsWith('/api') ? path.replace(/^\/api/, '') : path;
      const res = await fetch(`${baseUrl}${cleanPath}`, {
        ...options,
        headers: { ...headers, ...options?.headers },
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Continue
    }
  }

  return null;
}

export async function fetchStripeStatus(): Promise<StripeStatus> {
  const result = await tryFetchJson<StripeStatus>('/api/stripe/status');
  if (result) return result;

  return {
    connected: true,
    mode: 'test_sandbox_fallback',
    livemode: false,
    secret_key_configured: false,
    webhook_secret_configured: false,
    key_prefix: 'sandbox_demo',
    total_payments: 4,
    total_disputes: 3,
    needs_response_count: 3,
    webhook_events_count: 0,
    message: 'Running in Stripe Sandbox Test Mode (API Key not configured)',
  };
}

export async function fetchStripePayments(): Promise<StripePayment[]> {
  const res = await tryFetchJson<{ payments: StripePayment[] }>('/api/stripe/payments');
  return res?.payments || [];
}

export async function fetchStripeDisputes(): Promise<StripeDispute[]> {
  const res = await tryFetchJson<{ disputes: StripeDispute[] }>('/api/stripe/disputes');
  return res?.disputes || [];
}

export async function fetchStripeDispute(id: string): Promise<StripeDispute | null> {
  return tryFetchJson<StripeDispute>(`/api/stripe/disputes/${encodeURIComponent(id)}`);
}

export async function analyzeStripeDispute(id: string): Promise<CaseAnalysisResult | null> {
  return tryFetchJson<CaseAnalysisResult>(
    `/api/stripe/disputes/${encodeURIComponent(id)}/analyze`,
    {
      method: 'POST',
    }
  );
}

export async function recordStripeDisputeOutcome(
  id: string,
  outcome: 'WON' | 'LOST',
  actualResult: string,
  lesson: string
): Promise<{ status: string; dispute_status: string } | null> {
  return tryFetchJson<{ status: string; dispute_status: string }>(
    `/api/stripe/disputes/${encodeURIComponent(id)}/outcome`,
    {
      method: 'POST',
      body: JSON.stringify({
        outcome,
        actual_result: actualResult,
        lesson,
      }),
    }
  );
}

export async function fetchStripeWebhooks(): Promise<StripeWebhookEvent[]> {
  const res = await tryFetchJson<{ webhooks: StripeWebhookEvent[] }>('/api/stripe/webhooks');
  return res?.webhooks || [];
}

export async function createTestDispute(params: {
  reason: string;
  amount: number;
  customer_claim: string;
}): Promise<StripeDispute | null> {
  return tryFetchJson<StripeDispute>('/api/stripe/create-test-dispute', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
