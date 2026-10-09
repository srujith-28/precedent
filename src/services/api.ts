import {
  CaseAnalysisResult,
  CaseFormInput,
  DisputeDecision,
  EvidenceItem,
  MemoryEntry,
  OutcomeFormInput,
} from '../types/precedent';
import {
  buildConsolidatedPrecedents,
  consolidatedPrecedentToMemoryEntry,
  parseCaseIdFromText,
} from '../utils/precedentConsolidator';
import { buildEvidenceIntelligence } from '../utils/evidenceIntelligence';

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

export interface HealthCheckResult {
  backendConnected: boolean;
  hindsightConnected: boolean;
}

/**
 * Environment-independent API status check.
 * Does not claim a connection unless the FastAPI server responds.
 */
export async function checkBackendConnection(): Promise<HealthCheckResult> {
  const headers = {
    'ngrok-skip-browser-warning': 'true',
  };

  try {
    // Query /health on the application backend first (which performs the real Hindsight check)
    const healthRes = await fetch('/health', {
      method: 'GET',
      headers,
    });

    if (healthRes.ok) {
      let hindsightConnected = false;
      try {
        const body = (await healthRes.json()) as Record<string, unknown>;
        // Hindsight Connected ONLY when the backend reports Hindsight as available
        const hsObj =
          typeof body.hindsight === 'object' && body.hindsight !== null
            ? (body.hindsight as Record<string, unknown>)
            : null;
        const hsStatus = String(
          hsObj?.status ??
            body.hindsight_status ??
            body.hindsightStatus ??
            (typeof body.hindsight === 'string' ? body.hindsight : '')
        ).toLowerCase();
        const hsBool =
          body.hindsight === true ||
          body.hindsight_connected === true ||
          body.hindsight_available === true;

        if (
          hsStatus === 'connected' ||
          hsStatus === 'ok' ||
          hsStatus === 'available' ||
          hsBool === true
        ) {
          hindsightConnected = true;
        }
      } catch {
        // Non-JSON response cannot confirm Hindsight availability
        hindsightConnected = false;
      }
      return { backendConnected: true, hindsightConnected };
    }

    // Direct baseUrl fallback if /health on app origin returned non-ok
    const baseUrl = getApiBaseUrl();
    if (baseUrl) {
      const directRes = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers,
      });

      if (directRes.ok) {
        let hindsightConnected = false;
        try {
          const body = (await directRes.json()) as Record<string, unknown>;
          const hsObj =
            typeof body.hindsight === 'object' && body.hindsight !== null
              ? (body.hindsight as Record<string, unknown>)
              : null;
          const hsStatus = String(
            hsObj?.status ??
              body.hindsight_status ??
              body.hindsightStatus ??
              (typeof body.hindsight === 'string' ? body.hindsight : '')
          ).toLowerCase();
          const hsBool =
            body.hindsight === true ||
            body.hindsight_connected === true ||
            body.hindsight_available === true;

          if (
            hsStatus === 'connected' ||
            hsStatus === 'ok' ||
            hsStatus === 'available' ||
            hsBool === true
          ) {
            hindsightConnected = true;
          }
        } catch {
          hindsightConnected = false;
        }
        return { backendConnected: true, hindsightConnected };
      }
    }

    return { backendConnected: false, hindsightConnected: false };
  } catch {
    return { backendConnected: false, hindsightConnected: false };
  }
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

export function extractSourceCaseId(text: string): string | undefined {
  return parseCaseIdFromText(text);
}

interface BaselineApiResponse {
  baseline_recommendation?: string;
  baseline_confidence?: number;
  baseline_reasoning?: string;
}

/**
 * Requests Path 1 (WITHOUT HINDSIGHT) baseline analysis from the backend using
 * the exact same current-case inputs and zero Hindsight memories.
 */
async function fetchBaselineWithoutHindsight(
  payload: AnalyzeRequestPayload
): Promise<BaselineApiResponse | null> {
  try {
    const res = await fetch('/api/baseline-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as BaselineApiResponse;
    return body;
  } catch {
    return null;
  }
}

/**
 * Executes the two-path dispute analysis:
 * 1. WITHOUT HINDSIGHT (baseline decision from current-case evidence only)
 * 2. WITH HINDSIGHT (memory-aware decision from POST ${VITE_API_BASE_URL}/analyze)
 *
 * Sends exact required body to POST ${VITE_API_BASE_URL}/analyze:
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
  let baselineFromServer: BaselineApiResponse | null = null;

  try {
    const [analyzeRes, baselineRes] = await Promise.all([
      fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      }),
      fetchBaselineWithoutHindsight(payload),
    ]);
    response = analyzeRes;
    baselineFromServer = baselineRes;
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

  // If data.decision is a JSON string (or object), safely parse it
  let decisionObj: Record<string, unknown> | null = null;
  if (typeof data.decision === 'string') {
    const trimmedDecision = data.decision
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    if (trimmedDecision.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmedDecision);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          decisionObj = parsed as Record<string, unknown>;
        }
      } catch {
        decisionObj = null;
      }
    }
  } else if (
    typeof data.decision === 'object' &&
    data.decision !== null &&
    !Array.isArray(data.decision)
  ) {
    decisionObj = data.decision as Record<string, unknown>;
  }

  // Extract actual backend response fields from parsed decisionObj first, with top-level fallback:
  // recommendation, confidence, evidence_to_submit, reasoning, memory_used, and memories
  const rawRecommendation = String(
    decisionObj?.recommendation ??
      decisionObj?.decision ??
      data.recommendation ??
      (typeof data.decision === 'string' && !decisionObj
        ? data.decision
        : 'FIGHT')
  );
  const decision = normalizeDecision(rawRecommendation);
  const confidence = normalizeConfidence(
    decisionObj?.confidence ??
      decisionObj?.confidence_score ??
      data.confidence ??
      data.confidence_score ??
      0
  );

  const evidenceToSubmit = extractStringArray(
    decisionObj?.evidence_to_submit ??
      decisionObj?.recommended_evidence ??
      data.evidence_to_submit ??
      data.recommended_evidence ??
      data.recommendedEvidence ??
      data.evidence
  );

  const strongEvidence = extractStringArray(
    decisionObj?.strong_evidence ?? data.strong_evidence
  );
  const weakEvidence = extractStringArray(
    decisionObj?.weak_evidence ?? data.weak_evidence
  );
  const missingEvidence = extractStringArray(
    decisionObj?.missing_evidence ?? data.missing_evidence
  );
  const hasExplicitEvidenceCategories =
    strongEvidence.length > 0 ||
    weakEvidence.length > 0 ||
    missingEvidence.length > 0;

  const reasoning = String(
    decisionObj?.reasoning ??
      decisionObj?.explanation ??
      data.reasoning ??
      data.explanation ??
      data.rationale ??
      ''
  );

  const rawEvidenceStrategy =
    decisionObj?.evidence_strategy ??
    decisionObj?.strategy ??
    data.evidence_strategy ??
    data.strategy;
  const evidenceStrategy =
    typeof rawEvidenceStrategy === 'string' &&
    rawEvidenceStrategy.trim().length > 0
      ? rawEvidenceStrategy.trim()
      : undefined;

  const rawMemoryUsed = decisionObj?.memory_used ?? data.memory_used;

  const memoryUsedStrings =
    typeof rawMemoryUsed === 'string' || typeof rawMemoryUsed === 'object'
      ? extractStringArray(rawMemoryUsed).filter(
          (s) => !['true', 'false', 'none', 'null'].includes(s.toLowerCase())
        )
      : [];

  const topLevelMemories = extractStringArray(
    decisionObj?.recalled_memories ??
      decisionObj?.memories ??
      data.recalled_memories ??
      data.memories ??
      data.hindsight_memory_used ??
      data.memories_recalled
  );

  // Preserve exact raw recalled memories list returned by Hindsight
  const recalledMemoriesList =
    topLevelMemories.length > 0 ? topLevelMemories : memoryUsedStrings;

  const memoryUsedSummary =
    typeof rawMemoryUsed === 'string' &&
    !['true', 'false', 'none', 'null'].includes(
      rawMemoryUsed.trim().toLowerCase()
    )
      ? rawMemoryUsed.trim()
      : undefined;

  const memoryUsedFlag =
    typeof rawMemoryUsed === 'boolean'
      ? rawMemoryUsed
      : typeof rawMemoryUsed === 'string'
      ? !['', 'false', 'none', 'null'].includes(
          rawMemoryUsed.trim().toLowerCase()
        ) || recalledMemoriesList.length > 0
      : Boolean(rawMemoryUsed) || recalledMemoriesList.length > 0;

  const timestampNow =
    new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const recommendedEvidence: EvidenceItem[] = [];

  if (hasExplicitEvidenceCategories) {
    strongEvidence.forEach((item, idx) => {
      recommendedEvidence.push({
        id: `ev-strong-${Date.now()}-${idx}`,
        label: item,
        category: 'STRONG',
        strength: 'STRONG',
        status: 'PRESENT',
        description: 'Returned by backend in strong_evidence.',
      });
    });
    weakEvidence.forEach((item, idx) => {
      recommendedEvidence.push({
        id: `ev-weak-${Date.now()}-${idx}`,
        label: item,
        category: 'WEAK',
        strength: 'WEAK',
        status: 'RECOMMENDED',
        description: 'Returned by backend in weak_evidence.',
      });
    });
    missingEvidence.forEach((item, idx) => {
      recommendedEvidence.push({
        id: `ev-missing-${Date.now()}-${idx}`,
        label: item,
        category: 'MISSING',
        strength: 'MISSING',
        status: 'CRITICAL_GAP',
        description: 'Returned by backend in missing_evidence.',
      });
    });
  } else {
    evidenceToSubmit.forEach((itemText, idx) => {
      recommendedEvidence.push({
        id: `live-ev-${Date.now()}-${idx}`,
        label: itemText,
        category: 'evidence_to_submit',
        strength: 'UNCLASSIFIED',
        status: 'RECOMMENDED',
        description: memoryUsedFlag
          ? 'Recommended by Precedent /analyze (informed by Hindsight recall).'
          : 'Recommended by Precedent /analyze.',
      });
    });
  }

  // Resolve Path 1 (WITHOUT HINDSIGHT) baseline fields:
  // If NO Hindsight memory was recalled, baseline comparison is explicitly unavailable.
  const hasHindsightMemory = memoryUsedFlag && recalledMemoriesList.length > 0;

  let baselineComparisonStatus: 'available' | 'unavailable' = 'unavailable';
  let baselineComparison: string | undefined = 'Baseline comparison unavailable';
  let baselineRecommendation: DisputeDecision | undefined = undefined;
  let baselineConfidence: number | undefined = undefined;
  let baselineReasoning: string | undefined = undefined;

  if (hasHindsightMemory) {
    const rawBaselineRec =
      decisionObj?.baseline_recommendation ??
      data.baseline_recommendation ??
      baselineFromServer?.baseline_recommendation;

    if (typeof rawBaselineRec === 'string' && rawBaselineRec.trim().length > 0) {
      baselineRecommendation = normalizeDecision(rawBaselineRec.trim());
      baselineComparisonStatus = 'available';
      baselineComparison = undefined;

      const rawBaselineConf =
        decisionObj?.baseline_confidence ??
        data.baseline_confidence ??
        baselineFromServer?.baseline_confidence;

      if (
        rawBaselineConf !== undefined &&
        rawBaselineConf !== null &&
        String(rawBaselineConf).trim() !== ''
      ) {
        baselineConfidence = normalizeConfidence(rawBaselineConf);
      }

      const rawBaselineReasoning =
        decisionObj?.baseline_reasoning ??
        data.baseline_reasoning ??
        baselineFromServer?.baseline_reasoning;

      if (
        typeof rawBaselineReasoning === 'string' &&
        rawBaselineReasoning.trim().length > 0
      ) {
        baselineReasoning = rawBaselineReasoning.trim();
      }
    } else {
      baselineComparisonStatus = 'unavailable';
      baselineComparison = 'Baseline comparison unavailable';
    }
  } else {
    baselineComparisonStatus = 'unavailable';
    baselineComparison = 'Baseline comparison unavailable';
  }

  const rawPreviousOutcome =
    decisionObj?.previous_outcome ?? data.previous_outcome;
  const previousOutcome =
    typeof rawPreviousOutcome === 'string' &&
    rawPreviousOutcome.trim().length > 0
      ? rawPreviousOutcome.trim()
      : undefined;

  const resolvedCaseId = String(data.case_id ?? payload.case_id);

  // Consolidate raw recalled memories by Case ID, rank relevance, and filter current Case ID from historical precedents
  const consolidation = buildConsolidatedPrecedents({
    rawMemories: recalledMemoriesList,
    currentCaseId: resolvedCaseId,
    disputeType: payload.dispute_type,
    customerClaim: payload.customer_claim,
    merchantEvidence: payload.merchant_evidence,
    previousOutcomeHint: previousOutcome,
    timestamp: timestampNow,
  });

  // Build structured Evidence Intelligence (Available, Missing/Weak, Recommended, Impact, Hindsight Gap, Coverage)
  const evidenceIntelligence = buildEvidenceIntelligence({
    caseId: resolvedCaseId,
    disputeType: payload.dispute_type,
    merchantEvidence: payload.merchant_evidence,
    reasoning,
    memoryUsed: memoryUsedFlag,
    memoryUsedSummary,
    evidenceToSubmit,
    strongEvidence: strongEvidence.length > 0 ? strongEvidence : undefined,
    weakEvidence: weakEvidence.length > 0 ? weakEvidence : undefined,
    missingEvidence: missingEvidence.length > 0 ? missingEvidence : undefined,
    baselineEvidenceToSubmit:
      baselineFromServer?.baseline_recommendation !== undefined
        ? evidenceToSubmit
        : undefined,
    evidenceStrategy,
    displayedPrecedents: consolidation.displayedPrecedents,
    excludedCurrentCasePrecedents: consolidation.excludedCurrentCasePrecedents,
  });

  const primaryConsolidated =
    consolidation.displayedPrecedents[0] ??
    consolidation.excludedCurrentCasePrecedents[0];

  const rawRelevantPrecedent =
    decisionObj?.relevant_precedent ?? data.relevant_precedent;
  const relevantPrecedent =
    typeof rawRelevantPrecedent === 'string' &&
    rawRelevantPrecedent.trim().length > 0
      ? rawRelevantPrecedent.trim()
      : primaryConsolidated
      ? `${primaryConsolidated.caseId} · ${primaryConsolidated.disputeType}`
      : topLevelMemories[0] ?? memoryUsedStrings[0] ?? undefined;

  const rawKeyLesson =
    decisionObj?.key_lesson ??
    decisionObj?.lesson ??
    data.key_lesson ??
    data.lesson;
  const keyLesson =
    typeof rawKeyLesson === 'string' && rawKeyLesson.trim().length > 0
      ? rawKeyLesson.trim()
      : primaryConsolidated?.consolidatedLesson ??
        memoryUsedStrings[0] ??
        topLevelMemories[0] ??
        undefined;

  const allConsolidatedEntries = [
    ...consolidation.displayedPrecedents,
    ...consolidation.excludedCurrentCasePrecedents,
  ];

  const hindsightMemoryUsed: MemoryEntry[] = allConsolidatedEntries.map((p) =>
    consolidatedPrecedentToMemoryEntry(p, resolvedCaseId)
  );

  return {
    caseId: resolvedCaseId,
    disputeType: payload.dispute_type,
    customerClaim: payload.customer_claim,
    merchantEvidence: payload.merchant_evidence,
    decision,
    recommendation: decision,
    confidence,
    evidence_to_submit: evidenceToSubmit,
    strong_evidence: strongEvidence.length > 0 ? strongEvidence : undefined,
    weak_evidence: weakEvidence.length > 0 ? weakEvidence : undefined,
    missing_evidence: missingEvidence.length > 0 ? missingEvidence : undefined,
    hasExplicitEvidenceCategories,
    reasoning,
    memory_used: memoryUsedFlag,
    memory_used_summary: memoryUsedSummary,
    recalled_memories: recalledMemoriesList,
    historicalPrecedents: consolidation.historicalPrecedents,
    displayedPrecedents: consolidation.displayedPrecedents,
    excludedCurrentCasePrecedents: consolidation.excludedCurrentCasePrecedents,
    uniquePrecedentsCount: consolidation.totalUniqueCasesCount,
    historicalPrecedentsCount: consolidation.uniqueHistoricalPrecedentsCount,
    evidenceIntelligence,
    evidence_strategy: evidenceStrategy,
    recommendedEvidence,
    hindsightMemoryUsed,
    improvedByMemory: memoryUsedFlag,
    analyzedAt: timestampNow,
    baseline_recommendation: baselineRecommendation,
    baseline_confidence: baselineConfidence,
    baseline_reasoning: baselineReasoning,
    baseline_comparison: baselineComparison,
    baseline_comparison_status: baselineComparisonStatus,
    hindsight_recommendation: decision,
    hindsight_confidence: confidence,
    hindsight_reasoning: reasoning,
    previous_outcome: previousOutcome ?? primaryConsolidated?.outcome,
    relevant_precedent: relevantPrecedent,
    key_lesson: keyLesson,
  };
}

/**
 * Calls POST ${VITE_API_BASE_URL}/outcome
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
        'ngrok-skip-browser-warning': 'true',
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

  const timestampNow =
    new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const newMemory: MemoryEntry = {
    id: `live-ret-${Date.now()}`,
    memoryCode: payload.case_id.toUpperCase(),
    caseIdOrigin: payload.case_id.toUpperCase(),
    patternTitle: `${payload.case_id.toUpperCase()} · ${disputeType}`,
    disputeType,
    outcomeLearnedFrom: payload.outcome,
    actualResult: payload.actual_result,
    lesson: payload.lesson,
    rawMemories: [payload.lesson],
    rawMemoryCount: 1,
    relevanceContext: `Retained from ${payload.outcome} outcome on Case ${payload.case_id.toUpperCase()}`,
    sourceType: 'RETAINED IN HINDSIGHT',
    timestamp: timestampNow,
  };

  return {
    status: String(data.status || 'ok'),
    message: String(data.message || 'Outcome retained in Hindsight'),
    case_id: payload.case_id.toUpperCase(),
    outcome: payload.outcome,
    actual_result: payload.actual_result,
    lesson: payload.lesson,
    memory_entry: newMemory,
  };
}
