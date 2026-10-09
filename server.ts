import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

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

  app.use(express.json({ limit: '2mb' }));

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
