import {
  CaseAnalysisResult,
  CaseFormInput,
  DisputeDecision,
  EvidenceItem,
  MemoryEntry,
  OutcomeFormInput,
} from '../types/precedent';

export const BACKEND_UNAVAILABLE_MESSAGE =
  'Backend unavailable — connect FastAPI to run live analysis.';

/**
 * Base URL from VITE_API_BASE_URL.
 * Calls:
 * - POST ${VITE_API_BASE_URL}/analyze
 * - POST ${VITE_API_BASE_URL}/outcome
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().replace(/\/+$/, '');
  }
  return '';
}

export interface AnalyzeRequestPayload {
  case_id: string;
  dispute_type: string;
  amount: number;
  customer_claim: string;
  merchant_evidence: string;
}

export interface OutcomeRequestPayload {
  case_id: string;
  outcome: 'WON' | 'LOST';
  actual_result: string;
  lesson: string;
}

export interface OutcomeResponsePayload {
  status?: string;
  message?: string;
  case_id: string;
  outcome: 'WON' | 'LOST';
  actual_result: string;
  lesson: string;
  memory_entry: MemoryEntry;
}

function normalizeDecision(raw: unknown): DisputeDecision {
  if (typeof raw === 'string' && raw.toUpperCase().includes('FOLD')) {
    return 'FOLD';
  }
  return 'FIGHT';
}

function normalizeConfidence(raw: unknown): number {
  const num = Number(raw);
  if (Number.isNaN(num) || num < 0) return 0;
  if (num > 0 && num <= 1) return Math.round(num * 100);
  return Math.min(100, Math.round(num));
}

function extractStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return String(
            obj.label ||
              obj.item ||
              obj.name ||
              obj.lesson ||
              obj.text ||
              obj.content ||
              obj.memory ||
              JSON.stringify(obj)
          ).trim();
        }
        return String(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return [raw.trim()];
  }
  return [];
}

/**
 * Calls POST ${VITE_API_BASE_URL}/analyze
 * Sends exact required body:
 * {
 *   "case_id": "...",
 *   "dispute_type": "...",
 *   "amount": 0,
 *   "customer_claim": "...",
 *   "merchant_evidence": "..."
 * }
 */
export async function analyzeCaseWithPrecedent(
  input: CaseFormInput
): Promise<CaseAnalysisResult> {
  const baseUrl = getApiBaseUrl();
  const payload: AnalyzeRequestPayload = {
    case_id: input.caseId.trim(),
    dispute_type: input.disputeType.trim(),
    amount: Number(parseFloat(input.amount) || 0),
    customer_claim: input.customerClaim.trim(),
    merchant_evidence: input.merchantEvidence.trim(),
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
  }

  // Extract actual backend response fields:
  // recommendation, confidence, evidence_to_submit, reasoning, memory_used, and recalled memories
  const rawRecommendation = String(
    data.recommendation ?? data.decision ?? 'FIGHT'
  );
  const decision = normalizeDecision(rawRecommendation);
  const confidence = normalizeConfidence(
    data.confidence ?? data.confidence_score ?? 0
  );

  const evidenceToSubmit = extractStringArray(
    data.evidence_to_submit ??
      data.recommended_evidence ??
      data.recommendedEvidence ??
      data.evidence
  );

  const reasoning = String(
    data.reasoning ?? data.explanation ?? data.rationale ?? ''
  );

  const recalledMemoriesList = extractStringArray(
    data.recalled_memories ??
      data.memories ??
      data.hindsight_memory_used ??
      data.memories_recalled ??
      (typeof data.memory_used === 'object' || typeof data.memory_used === 'string'
        ? data.memory_used
        : undefined)
  );

  const memoryUsedFlag =
    typeof data.memory_used === 'boolean'
      ? data.memory_used
      : Boolean(data.memory_used) || recalledMemoriesList.length > 0;

  const recommendedEvidence: EvidenceItem[] = evidenceToSubmit.map(
    (itemText, idx) => ({
      id: `live-ev-${Date.now()}-${idx}`,
      label: itemText,
      category: memoryUsedFlag
        ? 'evidence_to_submit (Influenced by Hindsight Memory)'
        : 'evidence_to_submit',
      status: 'RECOMMENDED',
      description: memoryUsedFlag
        ? 'Recommended by FastAPI /analyze using recalled Hindsight memory.'
        : 'Recommended by FastAPI /analyze.',
      isDemo: false,
    })
  );

  const hindsightMemoryUsed: MemoryEntry[] = recalledMemoriesList.map(
    (memText, idx) => ({
      id: `live-mem-${Date.now()}-${idx}`,
      memoryCode: `RECALL-${idx + 1}`,
      patternTitle: `Recalled Hindsight Memory #${idx + 1}`,
      disputeType: payload.dispute_type,
      lesson: memText,
      recommendedAction: memText,
      recalledCount: 1,
      casesImprovedCount: 1,
      lastUpdated: 'Live FastAPI Recall',
      isDemo: false,
    })
  );

  return {
    caseId: String(data.case_id ?? payload.case_id),
    decision,
    recommendation: rawRecommendation,
    confidence,
    evidence_to_submit: evidenceToSubmit,
    reasoning,
    memory_used: memoryUsedFlag,
    recalled_memories: recalledMemoriesList,
    recommendedEvidence,
    hindsightMemoryUsed,
    improvedByMemory: memoryUsedFlag,
    analyzedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    isDemo: false,
  };
}

/**
 * Calls POST ${VITE_API_BASE_URL}/outcome
 * Sends exact required body:
 * {
 *   "case_id": "...",
 *   "outcome": "WON" or "LOST",
 *   "actual_result": "...",
 *   "lesson": "..."
 * }
 */
export async function submitOutcomeToPrecedent(
  input: OutcomeFormInput,
  disputeType = 'Subscription'
): Promise<OutcomeResponsePayload> {
  const baseUrl = getApiBaseUrl();
  const payload: OutcomeRequestPayload = {
    case_id: input.caseId.trim(),
    outcome: input.outcome,
    actual_result: input.actualResult.trim(),
    lesson: input.lesson.trim(),
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/outcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Allow 200 OK even if body is minimal
  }

  const newMemory: MemoryEntry = {
    id: `live-ret-${Date.now()}`,
    memoryCode: payload.case_id,
    caseIdOrigin: payload.case_id,
    patternTitle: `Outcome Retained from ${payload.case_id}`,
    disputeType,
    outcomeLearnedFrom: payload.outcome,
    actualResult: payload.actual_result,
    lesson: payload.lesson,
    recommendedAction: payload.lesson,
    recalledCount: 0,
    casesImprovedCount: 0,
    lastUpdated: new Date().toISOString().slice(0, 10),
    isDemo: false,
  };

  return {
    status: String(data.status || 'ok'),
    message: String(
      data.message || 'Outcome retained in Hindsight memory via POST /outcome.'
    ),
    case_id: payload.case_id,
    outcome: payload.outcome,
    actual_result: payload.actual_result,
    lesson: payload.lesson,
    memory_entry: newMemory,
  };
}
