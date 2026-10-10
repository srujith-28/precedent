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

export interface StripeConfigResponse {
  publishable_key: string;
  publishable_key_configured: boolean;
  mode: string;
  google_pay_supported: boolean;
  connected: boolean;
}

export function isValidStripePublishableKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  if (trimmed.includes('your_stripe') || trimmed.includes('placeholder') || trimmed.includes('sample')) {
    return false;
  }
  return trimmed.startsWith('pk_test_') || trimmed.startsWith('pk_live_');
}

/**
 * Authoritatively reads the Stripe publishable key from frontend environment variables.
 * In Vite applications, client-facing environment variables are prefixed with VITE_.
 */
export function getFrontendStripePublishableKey(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const viteKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (isValidStripePublishableKey(viteKey)) {
        return String(viteKey).trim();
      }
      const rawEnv = import.meta.env as Record<string, string | undefined>;
      if (isValidStripePublishableKey(rawEnv.STRIPE_PUBLISHABLE_KEY)) {
        return String(rawEnv.STRIPE_PUBLISHABLE_KEY).trim();
      }
    }
  } catch {
    // Continue fallback
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (isValidStripePublishableKey(process.env.VITE_STRIPE_PUBLISHABLE_KEY)) {
        return String(process.env.VITE_STRIPE_PUBLISHABLE_KEY).trim();
      }
      if (isValidStripePublishableKey(process.env.STRIPE_PUBLISHABLE_KEY)) {
        return String(process.env.STRIPE_PUBLISHABLE_KEY).trim();
      }
    }
  } catch {
    // Continue fallback
  }

  // Authoritative Stripe Test Mode publishable key for this workspace
  return 'pk_test_51UOthHHoPoB7rpEf5boSwkDVop1DAuTu7n334lhmFuuJ3BV6WrhKhKj4dkV0BvrbAVh047gYyWtSkPNmgqWMHd9k00cR1YapWo';
}

export async function fetchStripeConfig(): Promise<StripeConfigResponse | null> {
  return tryFetchJson<StripeConfigResponse>('/api/stripe/config');
}

export interface CreatePaymentIntentResponse {
  id: string;
  client_secret: string;
  amount: number;
  amount_cents: number;
  currency: string;
  status: string;
  publishable_key?: string;
  description?: string;
  message?: string;
}

export async function createPaymentIntent(params: {
  amount_cents?: number;
  amount?: number;
  currency?: string;
  customer_name?: string;
  customer_email?: string;
  description?: string;
  payment_method_type?: string;
}): Promise<CreatePaymentIntentResponse | null> {
  return tryFetchJson<CreatePaymentIntentResponse>('/api/stripe/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface PaymentIntentStatusResponse {
  id: string;
  amount: number;
  amount_cents: number;
  currency: string;
  status: string;
  description?: string;
  created?: number;
}

export async function fetchPaymentIntentStatus(
  paymentIntentId: string
): Promise<PaymentIntentStatusResponse | null> {
  return tryFetchJson<PaymentIntentStatusResponse>(
    `/api/stripe/payment-intent/${encodeURIComponent(paymentIntentId)}`
  );
}
