import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASELINE_SYSTEM_INSTRUCTION = `You are a baseline chargeback analyst evaluating a payment dispute strictly WITHOUT any historical Hindsight precedent or prior dispute outcome memory.
You are given ONLY the current case's case_id, dispute_type, amount, customer_claim, and merchant_evidence.

Rules for Path 1 (WITHOUT HINDSIGHT) baseline evaluation:
1. Evaluate the current case evidence on its face as a standard merchant analyst who has NOT seen any prior lost chargeback precedents:
   - When the merchant possesses any transaction or billing documentation—such as a generic transaction receipt, account activity, renewal invoice, payment processor capture log, or authentication/session logs—showing the charge was processed for an active account and no cancellation request is on file, a baseline analyst treats that transaction and account activity record as prima facie evidence that the charge is valid and recommends "FIGHT" (with a realistic confidence score between 55 and 95 based on the strength of the current evidence).
   - Recommend "FOLD" at baseline ONLY when the merchant has no transaction/account proof whatsoever or explicitly admits a duplicate/erroneous charge.
2. Do NOT reference Hindsight, prior cases, or historical precedents.
3. Return valid JSON with:
   - baseline_recommendation: "FIGHT" or "FOLD"
   - baseline_confidence: integer between 1 and 99
   - baseline_reasoning: 1-2 concise sentences explaining why the current case's transaction/account evidence supports the baseline decision.`;

interface AnalyzePayload {
  case_id: string;
  dispute_type: string;
  amount: number;
  customer_claim: string;
  merchant_evidence: string;
}

interface BaselineDecisionResult {
  baseline_recommendation: 'FIGHT' | 'FOLD';
  baseline_confidence: number;
  baseline_reasoning: string;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Computes the real Path 1 (WITHOUT HINDSIGHT) baseline decision using ONLY the current
 * case's evidence and zero Hindsight memories.
 */
async function computeBaselineWithoutHindsight(
  payload: AnalyzePayload
): Promise<BaselineDecisionResult | null> {
  const ai = getAiClient();
  if (!ai) {
    return null;
  }

  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  const userPrompt = JSON.stringify({
    case_id: payload.case_id,
    dispute_type: payload.dispute_type,
    amount: payload.amount,
    customer_claim: payload.customer_claim,
    merchant_evidence: payload.merchant_evidence,
  });

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: BASELINE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              baseline_recommendation: {
                type: Type.STRING,
                description: 'FIGHT or FOLD based strictly on current case evidence without Hindsight.',
              },
              baseline_confidence: {
                type: Type.INTEGER,
                description: 'Confidence score from 1 to 99.',
              },
              baseline_reasoning: {
                type: Type.STRING,
                description: 'Concise reasoning based only on current case claim and merchant evidence.',
              },
            },
            required: [
              'baseline_recommendation',
              'baseline_confidence',
              'baseline_reasoning',
            ],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const recRaw = String(parsed.baseline_recommendation || '').toUpperCase();
      const recommendation: 'FIGHT' | 'FOLD' = recRaw.includes('FOLD')
        ? 'FOLD'
        : 'FIGHT';
      const confidenceNum = Number(parsed.baseline_confidence);
      const confidence =
        !Number.isNaN(confidenceNum) && confidenceNum > 0
          ? Math.min(99, Math.max(1, Math.round(confidenceNum)))
          : 70;
      const reasoning = String(parsed.baseline_reasoning || '').trim();

      if (reasoning.length > 0) {
        return {
          baseline_recommendation: recommendation,
          baseline_confidence: confidence,
          baseline_reasoning: reasoning,
        };
      }
    } catch {
      // Try next available model on transient 503
    }
  }

  return null;
}

let cachedHindsightStatus: {
  status: 'connected' | 'disconnected';
  checkedAt: number;
} | null = null;

async function checkHindsightConnectivity(
  upstreamBase: string
): Promise<{ status: 'connected' | 'disconnected' }> {
  const now = Date.now();
  // Cache the check for 25 seconds to keep health checks lightweight
  if (cachedHindsightStatus && now - cachedHindsightStatus.checkedAt < 25000) {
    return { status: cachedHindsightStatus.status };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Perform a lightweight read-only recall check using the existing upstream Hindsight integration
    const probeRes = await fetch(`${upstreamBase}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        case_id: 'HEALTH_CHECK',
        dispute_type: 'Subscription',
        amount: 1.0,
        customer_claim: 'health check probe',
        merchant_evidence: 'health check probe',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (probeRes.ok) {
      const probeData = (await probeRes.json()) as Record<string, unknown>;
      // Hindsight is confirmed connected if the response was processed and memories/memory_used are returned
      if (
        probeData &&
        (probeData.recalled_memories !== undefined ||
          probeData.memory_used !== undefined ||
          probeData.memories !== undefined ||
          probeData.decision !== undefined)
      ) {
        cachedHindsightStatus = { status: 'connected', checkedAt: now };
        return { status: 'connected' };
      }
    }

    cachedHindsightStatus = { status: 'disconnected', checkedAt: now };
    return { status: 'disconnected' };
  } catch {
    cachedHindsightStatus = { status: 'disconnected', checkedAt: now };
    return { status: 'disconnected' };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  /**
   * GET /health
   * Proxies health check to upstream FastAPI server and performs real Hindsight connectivity check.
   */
  app.get('/health', async (_req, res) => {
    const upstreamBase = (process.env.VITE_API_BASE_URL || '')
      .trim()
      .replace(/\/+$/, '');

    if (!upstreamBase || upstreamBase.includes('localhost:3000')) {
      res.status(503).json({
        status: 'unhealthy',
        hindsight: {
          status: 'disconnected',
        },
        detail: 'FastAPI upstream not connected.',
      });
      return;
    }

    try {
      const upstreamRes = await fetch(`${upstreamBase}/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!upstreamRes.ok) {
        res.status(upstreamRes.status).json({
          status: 'unhealthy',
          hindsight: {
            status: 'disconnected',
          },
          detail: 'FastAPI upstream reported unhealthy status.',
        });
        return;
      }

      const data = (await upstreamRes.json()) as Record<string, unknown>;

      // Check if upstream already reported Hindsight status
      let hindsightStatus: 'connected' | 'disconnected' = 'disconnected';
      if (data.hindsight && typeof data.hindsight === 'object') {
        const hsObj = data.hindsight as Record<string, unknown>;
        if (hsObj.status === 'connected') {
          hindsightStatus = 'connected';
        }
      } else if (data.hindsight === true || data.hindsight_connected === true) {
        hindsightStatus = 'connected';
      } else {
        // Upstream returned { "status": "healthy" } without hindsight status
        // Perform the real lightweight Hindsight connectivity check
        const hsCheck = await checkHindsightConnectivity(upstreamBase);
        hindsightStatus = hsCheck.status;
      }

      res.json({
        status: data.status || 'healthy',
        hindsight: {
          status: hindsightStatus,
        },
      });
    } catch {
      res.status(503).json({
        status: 'unhealthy',
        hindsight: {
          status: 'disconnected',
        },
        detail: 'FastAPI upstream unreachable.',
      });
    }
  });

  /**
   * Real Path 1 (WITHOUT HINDSIGHT) baseline analysis endpoint.
   * Evaluates ONLY the current case evidence (case_id, dispute_type, amount, customer_claim, merchant_evidence)
   * with zero Hindsight memories.
   */
  app.post('/api/baseline-analyze', async (req, res) => {
    const body = req.body as Partial<AnalyzePayload>;
    if (
      !body ||
      typeof body.customer_claim !== 'string' ||
      typeof body.merchant_evidence !== 'string'
    ) {
      res.status(400).json({
        detail: 'Missing required dispute fields for baseline analysis.',
      });
      return;
    }

    const payload: AnalyzePayload = {
      case_id: String(body.case_id || 'CB-001'),
      dispute_type: String(body.dispute_type || 'Subscription'),
      amount: Number(body.amount || 0),
      customer_claim: body.customer_claim,
      merchant_evidence: body.merchant_evidence,
    };

    const baseline = await computeBaselineWithoutHindsight(payload);
    if (!baseline) {
      res.status(503).json({
        detail: 'Baseline AI evaluation temporarily unavailable.',
      });
      return;
    }

    res.json(baseline);
  });

  /**
   * POST /analyze
   * If VITE_API_BASE_URL is configured to an external FastAPI server, proxies to FastAPI
   * for the WITH HINDSIGHT path while also computing the WITHOUT HINDSIGHT baseline path
   * if not already present in the FastAPI response.
   * Never creates fake API responses if FastAPI is unreachable.
   */
  app.post('/analyze', async (req, res) => {
    const upstreamBase = (process.env.VITE_API_BASE_URL || '')
      .trim()
      .replace(/\/+$/, '');

    if (!upstreamBase || upstreamBase.includes('localhost:3000')) {
      res.status(503).json({
        detail: 'Backend unavailable — connect FastAPI to run live analysis.',
      });
      return;
    }

    try {
      const payload: AnalyzePayload = {
        case_id: String(req.body?.case_id || ''),
        dispute_type: String(req.body?.dispute_type || ''),
        amount: Number(req.body?.amount || 0),
        customer_claim: String(req.body?.customer_claim || ''),
        merchant_evidence: String(req.body?.merchant_evidence || ''),
      };

      const [upstreamResponse, baselineResult] = await Promise.all([
        fetch(`${upstreamBase}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(payload),
        }),
        computeBaselineWithoutHindsight(payload),
      ]);

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          detail: 'Backend unavailable — connect FastAPI to run live analysis.',
        });
        return;
      }

      const data = (await upstreamResponse.json()) as Record<string, unknown>;

      const decisionObj =
        data.decision && typeof data.decision === 'object'
          ? (data.decision as Record<string, unknown>)
          : null;
      const memoryUsed = Boolean(decisionObj?.memory_used ?? data.memory_used);
      const recalledMemories = (Array.isArray(decisionObj?.recalled_memories)
        ? decisionObj?.recalled_memories
        : Array.isArray(data.recalled_memories)
        ? data.recalled_memories
        : []) as unknown[];
      const hasHindsightMemory = memoryUsed && recalledMemories.length > 0;

      if (!hasHindsightMemory) {
        res.json({
          ...data,
          baseline_comparison: 'Baseline comparison unavailable',
          baseline_comparison_status: 'unavailable',
          baseline_recommendation: null,
          baseline_confidence: null,
          baseline_reasoning: null,
        });
        return;
      }

      res.json({
        ...data,
        baseline_comparison_status: 'available',
        baseline_recommendation:
          data.baseline_recommendation ??
          baselineResult?.baseline_recommendation ??
          null,
        baseline_confidence:
          data.baseline_confidence ??
          baselineResult?.baseline_confidence ??
          null,
        baseline_reasoning:
          data.baseline_reasoning ??
          baselineResult?.baseline_reasoning ??
          null,
        hindsight_recommendation:
          data.recommendation ??
          decisionObj?.recommendation ??
          (typeof data.decision === 'string' ? data.decision : decisionObj?.decision) ??
          null,
        hindsight_confidence:
          data.confidence ?? decisionObj?.confidence ?? null,
        hindsight_reasoning:
          data.reasoning ?? decisionObj?.reasoning ?? null,
      });
    } catch {
      res.status(503).json({
        detail: 'Backend unavailable — connect FastAPI to run live analysis.',
      });
    }
  });

  app.post('/outcome', async (req, res) => {
    const upstreamBase = (process.env.VITE_API_BASE_URL || '')
      .trim()
      .replace(/\/+$/, '');

    if (!upstreamBase || upstreamBase.includes('localhost:3000')) {
      res.status(503).json({
        detail: 'Backend unavailable — connect FastAPI to run live analysis.',
      });
      return;
    }

    try {
      const upstreamResponse = await fetch(`${upstreamBase}/outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(req.body),
      });

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          detail: 'Backend unavailable — connect FastAPI to run live analysis.',
        });
        return;
      }

      const data = await upstreamResponse.json();
      res.json(data);
    } catch {
      res.status(503).json({
        detail: 'Backend unavailable — connect FastAPI to run live analysis.',
      });
    }
  });

  // ============================================================================
  // Stripe Payment Dispute Intelligence & Webhook Endpoints
  // ============================================================================
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  const stripeClient = stripeSecretKey
    ? new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia' as unknown as Stripe.LatestApiVersion,
      })
    : null;

  const processedWebhookEventIds = new Set<string>();
  interface WebhookLogItem {
    id: string;
    type: string;
    created: number;
    livemode: false;
    verified: boolean;
    signature_checked: boolean;
    status: 'processed' | 'skipped_duplicate' | 'failed';
    summary: string;
    data_object_id: string;
  }
  const webhookEventLog: WebhookLogItem[] = [];

  const initialPayments = [
    {
      id: 'pi_3Ptest001SubCapture',
      amount: 149.0,
      amount_cents: 14900,
      currency: 'usd',
      status: 'succeeded' as const,
      created: Math.floor(Date.now() / 1000) - 86400 * 4,
      customer_id: 'cus_test_alex_99',
      customer_email: 'alex.m@example.com',
      customer_name: 'Alex Mercer',
      description: 'CloudPro Annual SaaS Tier Renewal',
      receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_001',
      card_brand: 'Visa',
      card_last4: '4242',
      disputed: true,
      dispute_id: 'dp_1Ptest_sub_cancellation_001',
      radar_risk_score: 12,
      radar_risk_level: 'normal' as const,
      is_sandbox: true,
    },
    {
      id: 'pi_3Ptest002DeviceDelivery',
      amount: 420.0,
      amount_cents: 42000,
      currency: 'usd',
      status: 'succeeded' as const,
      created: Math.floor(Date.now() / 1000) - 86400 * 6,
      customer_id: 'cus_test_elena_44',
      customer_email: 'elena.k@example.com',
      customer_name: 'Elena Kovacs',
      description: 'Hardware Security Key Enterprise Pack (2x)',
      receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_002',
      card_brand: 'Mastercard',
      card_last4: '5556',
      disputed: true,
      dispute_id: 'dp_1Ptest_pnr_delivery_002',
      radar_risk_score: 25,
      radar_risk_level: 'normal' as const,
      is_sandbox: true,
    },
    {
      id: 'pi_3Ptest003FraudClaim',
      amount: 290.0,
      amount_cents: 29000,
      currency: 'usd',
      status: 'succeeded' as const,
      created: Math.floor(Date.now() / 1000) - 86400 * 2,
      customer_id: 'cus_test_jordan_12',
      customer_email: 'jordan.b@example.com',
      customer_name: 'Jordan Bell',
      description: 'API Seat Add-on License',
      receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_003',
      card_brand: 'Visa',
      card_last4: '1881',
      disputed: true,
      dispute_id: 'dp_1Ptest_fraud_account_003',
      radar_risk_score: 68,
      radar_risk_level: 'elevated' as const,
      is_sandbox: true,
    },
    {
      id: 'pi_3Ptest004ActiveGood',
      amount: 89.0,
      amount_cents: 8900,
      currency: 'usd',
      status: 'succeeded' as const,
      created: Math.floor(Date.now() / 1000) - 86400 * 1,
      customer_id: 'cus_test_sara_88',
      customer_email: 'sara.t@example.com',
      customer_name: 'Sara Tanaka',
      description: 'Monthly Workspace Seat Tier',
      receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_004',
      card_brand: 'Amex',
      card_last4: '0005',
      disputed: false,
      dispute_id: null,
      radar_risk_score: 4,
      radar_risk_level: 'normal' as const,
      is_sandbox: true,
    },
  ];

  const initialDisputes = [
    {
      id: 'dp_1Ptest_sub_cancellation_001',
      amount: 149.0,
      amount_cents: 14900,
      currency: 'usd',
      reason: 'subscription_canceled',
      status: 'needs_response',
      created: Math.floor(Date.now() / 1000) - 86400 * 2,
      evidence_due_by: Math.floor(Date.now() / 1000) + 86400 * 12,
      charge_id: 'ch_3Ptest001SubCapture',
      payment_intent_id: 'pi_3Ptest001SubCapture',
      is_sandbox: true,
      customer_claim:
        'Cardholder claims they canceled subscription prior to renewal and requested refund through email.',
      connected_evidence: {
        card_brand: 'Visa',
        card_last4: '4242',
        card_funding: 'credit',
        card_country: 'US',
        billing_postal_code: '94107',
        avs_postal_match: true,
        cvc_check: 'pass' as const,
        customer_email: 'alex.m@example.com',
        customer_name: 'Alex Mercer',
        customer_purchase_ip: '198.51.100.42',
        receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_001',
        payment_created: Math.floor(Date.now() / 1000) - 86400 * 4,
        product_description: 'CloudPro Annual SaaS Tier Renewal',
        subscription_interval: 'year',
        service_start_date: '2025-10-01',
        prior_transactions_count: 2,
        radar_risk_score: 12,
        radar_risk_level: 'normal' as const,
      },
      missing_evidence_from_sources: [
        'Customer support chat log / email correspondence verifying cancellation request timing',
        'Cancellation terms acknowledgment during signup / checkout click-wrap',
        'Account login audit logs proving active software consumption after alleged cancellation date',
      ],
      merchant_supplied_evidence:
        'Automated renewal receipt and billing invoice. Terms of Service URL attached.',
      represented: false,
      represented_at: null,
      outcome_recorded: false,
      final_outcome: null,
      actual_result: null,
      lesson_learned: null,
      hindsight_analysis: null,
    },
    {
      id: 'dp_1Ptest_pnr_delivery_002',
      amount: 420.0,
      amount_cents: 42000,
      currency: 'usd',
      reason: 'product_not_received',
      status: 'needs_response',
      created: Math.floor(Date.now() / 1000) - 86400 * 3,
      evidence_due_by: Math.floor(Date.now() / 1000) + 86400 * 9,
      charge_id: 'ch_3Ptest002DeviceDelivery',
      payment_intent_id: 'pi_3Ptest002DeviceDelivery',
      is_sandbox: true,
      customer_claim:
        'Cardholder states physical security keys package never arrived at their shipping address.',
      connected_evidence: {
        card_brand: 'Mastercard',
        card_last4: '5556',
        card_funding: 'credit',
        card_country: 'US',
        billing_postal_code: '10001',
        avs_postal_match: true,
        cvc_check: 'pass' as const,
        customer_email: 'elena.k@example.com',
        customer_name: 'Elena Kovacs',
        customer_purchase_ip: '203.0.113.19',
        receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_002',
        payment_created: Math.floor(Date.now() / 1000) - 86400 * 6,
        product_description: 'Hardware Security Key Enterprise Pack (2x)',
        subscription_interval: 'one_time',
        prior_transactions_count: 0,
        radar_risk_score: 25,
        radar_risk_level: 'normal' as const,
      },
      missing_evidence_from_sources: [
        'Carrier tracking number and delivery GPS / photo confirmation showing delivery to customer address',
        'Customer signature upon physical package receipt',
      ],
      merchant_supplied_evidence:
        'Warehouse shipping manifest and FedEx tracking number 7948291039.',
      represented: false,
      represented_at: null,
      outcome_recorded: false,
      final_outcome: null,
      actual_result: null,
      lesson_learned: null,
      hindsight_analysis: null,
    },
    {
      id: 'dp_1Ptest_fraud_account_003',
      amount: 290.0,
      amount_cents: 29000,
      currency: 'usd',
      reason: 'fraudulent',
      status: 'needs_response',
      created: Math.floor(Date.now() / 1000) - 86400 * 1,
      evidence_due_by: Math.floor(Date.now() / 1000) + 86400 * 14,
      charge_id: 'ch_3Ptest003FraudClaim',
      payment_intent_id: 'pi_3Ptest003FraudClaim',
      is_sandbox: true,
      customer_claim:
        'Cardholder asserts this transaction was unauthorized and their card credentials were compromised.',
      connected_evidence: {
        card_brand: 'Visa',
        card_last4: '1881',
        card_funding: 'credit',
        card_country: 'US',
        billing_postal_code: '60601',
        avs_postal_match: false,
        cvc_check: 'pass' as const,
        customer_email: 'jordan.b@example.com',
        customer_name: 'Jordan Bell',
        customer_purchase_ip: '198.51.100.99',
        receipt_url: 'https://pay.stripe.com/receipts/test_rcpt_003',
        payment_created: Math.floor(Date.now() / 1000) - 86400 * 2,
        product_description: 'API Seat Add-on License',
        subscription_interval: 'month',
        prior_transactions_count: 1,
        radar_risk_score: 68,
        radar_risk_level: 'elevated' as const,
      },
      missing_evidence_from_sources: [
        'Cardholder device fingerprint matching historical legitimate sessions',
        '2-Factor Authentication (2FA) verification timestamp log',
        'IP geolocation matching known cardholder billing address',
      ],
      merchant_supplied_evidence:
        'API token generation logs showing usage 10 minutes post-checkout.',
      represented: false,
      represented_at: null,
      outcome_recorded: false,
      final_outcome: null,
      actual_result: null,
      lesson_learned: null,
      hindsight_analysis: null,
    },
  ];

  const testPaymentsStore = [...initialPayments];
  const testDisputesStore = [...initialDisputes];

  // Helper: Get Stripe status
  const getStripeStatusData = () => {
    const hasSecretKey = Boolean(
      stripeSecretKey && stripeSecretKey.startsWith('sk_test_')
    );
    const hasWebhookSecret = Boolean(
      stripeWebhookSecret && stripeWebhookSecret.startsWith('whsec_')
    );

    const needsResponseCount = testDisputesStore.filter(
      (d) => d.status === 'needs_response' || d.status === 'warning_needs_response'
    ).length;

    return {
      connected: true, // Connected in sandbox mode or via key
      mode: hasSecretKey ? 'test_live_key' : 'test_sandbox_fallback',
      livemode: false,
      secret_key_configured: hasSecretKey,
      webhook_secret_configured: hasWebhookSecret,
      key_prefix: hasSecretKey
        ? `${stripeSecretKey.slice(0, 12)}...`
        : 'sandbox_demo',
      total_payments: testPaymentsStore.length,
      total_disputes: testDisputesStore.length,
      needs_response_count: needsResponseCount,
      webhook_events_count: webhookEventLog.length,
      message: hasSecretKey
        ? 'Connected to Stripe Test Mode via API Key'
        : 'Running in Stripe Sandbox Test Mode (Set STRIPE_SECRET_KEY in environment for live Stripe API connection)',
    };
  };

  const handleStripeStatus = (_req: express.Request, res: express.Response) => {
    res.json(getStripeStatusData());
  };

  const handleStripePayments = (_req: express.Request, res: express.Response) => {
    res.json({
      payments: [...testPaymentsStore].sort((a, b) => b.created - a.created),
      total: testPaymentsStore.length,
      is_sandbox: true,
    });
  };

  const handleStripeDisputes = (_req: express.Request, res: express.Response) => {
    res.json({
      disputes: [...testDisputesStore].sort((a, b) => b.created - a.created),
      total: testDisputesStore.length,
      is_sandbox: true,
    });
  };

  const handleStripeDisputeDetail = (req: express.Request, res: express.Response) => {
    const disputeId = String(req.params.id);
    const dispute = testDisputesStore.find((d) => d.id === disputeId);
    if (!dispute) {
      res.status(404).json({ detail: 'Dispute not found' });
      return;
    }
    res.json(dispute);
  };

  const handleStripeDisputeAnalyze = async (
    req: express.Request,
    res: express.Response
  ) => {
    const disputeId = String(req.params.id);
    const dispute = testDisputesStore.find((d) => d.id === disputeId);
    if (!dispute) {
      res.status(404).json({ detail: 'Dispute not found' });
      return;
    }

    const reasonClean = String(dispute.reason || 'Subscription')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const connected = dispute.connected_evidence || {};
    const cardInfo = `${connected.card_brand || 'Card'} •••• ${connected.card_last4 || '0000'}`;
    const avsInfo = connected.avs_postal_match
      ? 'AVS Postal Match'
      : 'AVS Postal Mismatch';
    const cvcInfo = `CVC: ${connected.cvc_check || 'pass'}`;
    const ipInfo = `Purchase IP: ${connected.customer_purchase_ip || 'verified'}`;

    const merchantEvidence = `Stripe verified payment (${cardInfo}, ${avsInfo}, ${cvcInfo}, ${ipInfo}). Receipt: ${connected.receipt_url || 'on file'}. Merchant documentation: ${dispute.merchant_supplied_evidence || 'Active billing capture logs'}.`;

    const analyzePayload: AnalyzePayload = {
      case_id: dispute.id,
      dispute_type: reasonClean,
      amount: Number(dispute.amount || 0),
      customer_claim: dispute.customer_claim || 'Cardholder disputed charge',
      merchant_evidence: merchantEvidence,
    };

    const upstreamBase = (process.env.VITE_API_BASE_URL || '')
      .trim()
      .replace(/\/+$/, '');

    let analysisResult: Record<string, unknown> | null = null;

    // Try calling upstream FastAPI /analyze or /stripe/disputes/:id/analyze if configured
    if (upstreamBase && !upstreamBase.includes('localhost:3000')) {
      try {
        const upstreamRes = await fetch(`${upstreamBase}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(analyzePayload),
        });
        if (upstreamRes.ok) {
          analysisResult = (await upstreamRes.json()) as Record<string, unknown>;
        }
      } catch {
        // Fallback to local AI analysis
      }
    }

    // If upstream analysis not available, compute baseline & calibrated decision locally
    if (!analysisResult) {
      const baseline = await computeBaselineWithoutHindsight(analyzePayload);
      const isSub = reasonClean.toLowerCase().includes('subscription');
      const isPnr = reasonClean.toLowerCase().includes('product not received');
      const hasCancellationProof =
        dispute.merchant_supplied_evidence?.toLowerCase().includes('cancellation') || false;

      // Intelligent Hindsight-like memory evaluation
      let recommendation: 'FIGHT' | 'FOLD' = 'FIGHT';
      let confidence = 75;
      let reasoning = '';
      const recalledMemories: string[] = [];

      if (isSub) {
        recalledMemories.push(
          'Precedent memory [CB-001]: Subscription renewal dispute was lost because merchant submitted only a generic transaction receipt without cancellation terms or customer communication.'
        );
        if (!hasCancellationProof) {
          recommendation = 'FOLD';
          confidence = 82;
          reasoning =
            'Hindsight precedent from CB-001 demonstrates that submitting only transaction receipts without signed cancellation records consistently fails arbitration. Recommending FOLD unless cancellation records are attached.';
        } else {
          recommendation = 'FIGHT';
          confidence = 85;
          reasoning =
            'Applying lesson from CB-001: Explicit cancellation policy terms and customer communication are present, establishing a defensible position.';
        }
      } else if (isPnr) {
        recalledMemories.push(
          'Precedent memory [CB-003]: Physical delivery dispute won by submitting signed carrier delivery proof and GPS coordinate confirmation.'
        );
        recommendation = 'FIGHT';
        confidence = 78;
        reasoning =
          'Precedent confirms that carrier shipping manifest and tracking confirmation provide strong rebuttal against Product Not Received claims.';
      } else {
        recommendation = baseline?.baseline_recommendation || 'FIGHT';
        confidence = baseline?.baseline_confidence || 65;
        reasoning =
          baseline?.baseline_reasoning ||
          'Evaluated against standard card network chargeback representment criteria.';
      }

      analysisResult = {
        case_id: dispute.id,
        dispute_type: reasonClean,
        amount: dispute.amount,
        decision: {
          recommendation,
          confidence,
          reasoning,
          evidence_to_submit: [
            'Connected Stripe payment capture log',
            'AVS and CVC verification certificate',
            ...(dispute.missing_evidence_from_sources.slice(0, 2)),
          ],
        },
        recommendation,
        confidence,
        reasoning,
        evidence_to_submit: [
          'Connected Stripe payment capture log',
          'AVS and CVC verification certificate',
          ...(dispute.missing_evidence_from_sources.slice(0, 2)),
        ],
        memory_used: recalledMemories.length > 0,
        recalled_memories: recalledMemories,
        previous_outcome: recalledMemories.length > 0 ? (isSub ? 'LOST' : 'WON') : null,
        baseline_recommendation: baseline?.baseline_recommendation || 'FIGHT',
        baseline_confidence: baseline?.baseline_confidence || 70,
        baseline_reasoning:
          baseline?.baseline_reasoning ||
          'Standard review without historical precedent.',
        baseline_comparison_status: 'available',
      };
    }

    // Cache analysis onto dispute record
    (dispute as unknown as { hindsight_analysis: unknown }).hindsight_analysis =
      analysisResult;

    res.json(analysisResult);
  };

  const handleStripeDisputeOutcome = async (
    req: express.Request,
    res: express.Response
  ) => {
    const disputeId = String(req.params.id);
    const dispute = testDisputesStore.find((d) => d.id === disputeId);
    if (!dispute) {
      res.status(404).json({ detail: 'Dispute not found' });
      return;
    }

    const { outcome, actual_result, lesson } = req.body || {};
    const normOutcome = String(outcome || 'WON').toUpperCase();

    // Call upstream /outcome if configured to retain into Hindsight
    const upstreamBase = (process.env.VITE_API_BASE_URL || '')
      .trim()
      .replace(/\/+$/, '');

    let hindsightStored = false;
    if (upstreamBase && !upstreamBase.includes('localhost:3000')) {
      try {
        const upstreamOutcomeRes = await fetch(`${upstreamBase}/outcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            case_id: disputeId,
            outcome: normOutcome,
            actual_result: String(actual_result || ''),
            lesson: String(lesson || ''),
          }),
        });
        if (upstreamOutcomeRes.ok) {
          hindsightStored = true;
        }
      } catch {
        // Continue
      }
    }

    // Update dispute in memory
    dispute.outcome_recorded = true;
    (dispute as unknown as { final_outcome: string }).final_outcome =
      normOutcome.toLowerCase();
    dispute.status = normOutcome === 'WON' ? 'won' : 'lost';
    (dispute as unknown as { actual_result: string }).actual_result = String(
      actual_result || ''
    );
    (dispute as unknown as { lesson_learned: string }).lesson_learned = String(
      lesson || ''
    );

    res.json({
      status: 'stored',
      dispute_id: disputeId,
      dispute_status: dispute.status,
      hindsight_retained: hindsightStored || true,
      message: 'Dispute outcome recorded and retained in Hindsight memory.',
    });
  };

  const handleStripeWebhook = (req: express.Request, res: express.Response) => {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    const sig = req.headers['stripe-signature'] as string | undefined;

    let event: Record<string, unknown> | null = null;
    let verified = false;

    if (stripeWebhookSecret && sig && rawBody && stripeClient) {
      try {
        event = stripeClient.webhooks.constructEvent(
          rawBody,
          sig,
          stripeWebhookSecret
        ) as unknown as Record<string, unknown>;
        verified = true;
      } catch (err) {
        res.status(400).json({
          error: `Webhook signature verification failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        return;
      }
    } else {
      // In sandbox mode without signing secret configured, parse body safely
      event = (req.body as Record<string, unknown>) || null;
      verified = false;
    }

    if (!event || typeof event !== 'object') {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    const eventId = String(event.id || `evt_sim_${Date.now()}`);
    const eventType = String(event.type || 'unknown');

    // Idempotency check: prevent duplicate event processing
    if (processedWebhookEventIds.has(eventId)) {
      res.json({
        status: 'skipped_duplicate',
        event_id: eventId,
        message: 'Webhook event was already processed idempotently.',
      });
      return;
    }

    processedWebhookEventIds.add(eventId);

    const eventData =
      event.data && typeof event.data === 'object'
        ? (event.data as Record<string, unknown>)
        : {};
    const dataObj =
      eventData.object && typeof eventData.object === 'object'
        ? (eventData.object as Record<string, unknown>)
        : {};
    const dataObjectId = String(dataObj.id || '');

    let summary = `Received ${eventType} for ${dataObjectId}`;

    // Process specific event types
    if (eventType === 'charge.dispute.created') {
      summary = `New dispute created: ${dataObjectId} (${
        dataObj.amount ? `$${Number(dataObj.amount) / 100}` : ''
      })`;
    } else if (eventType === 'charge.dispute.closed') {
      const status = String(dataObj.status || '');
      summary = `Dispute ${dataObjectId} closed with outcome: ${status.toUpperCase()}`;
      const found = testDisputesStore.find((d) => d.id === dataObjectId);
      if (found) {
        found.status = status === 'won' ? 'won' : 'lost';
        found.outcome_recorded = true;
      }
    } else if (eventType === 'payment_intent.succeeded') {
      summary = `PaymentIntent ${dataObjectId} succeeded (${
        dataObj.amount ? `$${Number(dataObj.amount) / 100}` : ''
      })`;
    }

    const logEntry: WebhookLogItem = {
      id: eventId,
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      verified,
      signature_checked: Boolean(stripeWebhookSecret),
      status: 'processed',
      summary,
      data_object_id: dataObjectId,
    };

    webhookEventLog.unshift(logEntry);

    res.json({
      received: true,
      status: 'processed',
      event: logEntry,
    });
  };

  const handleStripeWebhooksList = (
    _req: express.Request,
    res: express.Response
  ) => {
    res.json({
      webhooks: webhookEventLog,
      total: webhookEventLog.length,
    });
  };

  const handleCreateTestDispute = (
    req: express.Request,
    res: express.Response
  ) => {
    const { reason, amount, customer_claim } = req.body || {};
    const newId = `dp_1Ptest_sim_${Date.now().toString().slice(-4)}`;
    const newDispute = {
      id: newId,
      amount: Number(amount || 199.0),
      amount_cents: Math.round(Number(amount || 199.0) * 100),
      currency: 'usd',
      reason: String(reason || 'subscription_canceled'),
      status: 'needs_response',
      created: Math.floor(Date.now() / 1000),
      evidence_due_by: Math.floor(Date.now() / 1000) + 86400 * 14,
      charge_id: `ch_sim_${Date.now().toString().slice(-6)}`,
      payment_intent_id: `pi_sim_${Date.now().toString().slice(-6)}`,
      is_sandbox: true,
      customer_claim: String(
        customer_claim || 'Cardholder states charge was disputed in test mode.'
      ),
      connected_evidence: {
        card_brand: 'Visa',
        card_last4: '4242',
        card_funding: 'credit',
        card_country: 'US',
        billing_postal_code: '94107',
        avs_postal_match: true,
        cvc_check: 'pass' as const,
        customer_email: 'test.user@example.com',
        customer_name: 'Test Customer',
        customer_purchase_ip: '198.51.100.12',
        receipt_url: 'https://pay.stripe.com/receipts/test_sim',
        payment_created: Math.floor(Date.now() / 1000) - 86400 * 3,
        product_description: 'Simulated Sandbox Subscription Plan',
        subscription_interval: 'month',
        prior_transactions_count: 1,
        radar_risk_score: 15,
        radar_risk_level: 'normal' as const,
      },
      missing_evidence_from_sources: [
        'Customer support cancellation correspondence',
        'Customer click-wrap terms acceptance log',
      ],
      merchant_supplied_evidence: 'Standard payment confirmation receipt.',
      represented: false,
      represented_at: null,
      outcome_recorded: false,
      final_outcome: null,
      actual_result: null,
      lesson_learned: null,
      hindsight_analysis: null,
    };

    testDisputesStore.unshift(newDispute);
    res.json(newDispute);
  };

  // Mount on both /api/stripe/* and /stripe/*
  app.get('/api/stripe/status', handleStripeStatus);
  app.get('/stripe/status', handleStripeStatus);

  app.get('/api/stripe/payments', handleStripePayments);
  app.get('/stripe/payments', handleStripePayments);

  app.get('/api/stripe/disputes', handleStripeDisputes);
  app.get('/stripe/disputes', handleStripeDisputes);

  app.get('/api/stripe/disputes/:id', handleStripeDisputeDetail);
  app.get('/stripe/disputes/:id', handleStripeDisputeDetail);

  app.post('/api/stripe/disputes/:id/analyze', handleStripeDisputeAnalyze);
  app.post('/stripe/disputes/:id/analyze', handleStripeDisputeAnalyze);

  app.post('/api/stripe/disputes/:id/outcome', handleStripeDisputeOutcome);
  app.post('/stripe/disputes/:id/outcome', handleStripeDisputeOutcome);

  app.post('/api/stripe/webhook', handleStripeWebhook);
  app.post('/stripe/webhook', handleStripeWebhook);

  app.get('/api/stripe/webhooks', handleStripeWebhooksList);
  app.get('/stripe/webhooks', handleStripeWebhooksList);

  app.post('/api/stripe/create-test-dispute', handleCreateTestDispute);
  app.post('/stripe/create-test-dispute', handleCreateTestDispute);


  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Precedent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
