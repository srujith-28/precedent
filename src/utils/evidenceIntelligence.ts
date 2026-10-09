import { ConsolidatedPrecedent } from './precedentConsolidator';

export type EvidenceStatusBadge =
  | 'AVAILABLE'
  | 'MISSING'
  | 'WEAK'
  | 'RECOMMENDED'
  | 'Status unavailable';

export interface StructuredEvidenceEntry {
  id: string;
  label: string;
  status: EvidenceStatusBadge;
  whyItMatters: string;
}

export interface HindsightIdentifiedEvidenceGap {
  previousCaseId: string;
  historicalOutcome: string;
  lesson: string;
  currentCaseId: string;
  potentialEvidenceGap: string;
}

export interface EvidenceStrategyComparison {
  strategyChanged: boolean;
  withoutHindsightEvidence: string[];
  withHindsightEvidence: string[];
  evidenceStrategyText?: string;
}

export interface EvidenceCoverageCounts {
  available: number;
  missing: number;
  weak: number;
  recommended: number;
}

export interface EvidenceIntelligenceData {
  availableEvidence: StructuredEvidenceEntry[];
  missingEvidence: StructuredEvidenceEntry[];
  weakEvidence: StructuredEvidenceEntry[];
  recommendedEvidence: StructuredEvidenceEntry[];
  coverage: EvidenceCoverageCounts;
  hindsightEvidenceGap: HindsightIdentifiedEvidenceGap | null;
  evidenceStrategyComparison: EvidenceStrategyComparison;
  evidenceStrategyText?: string;
}

function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Cleans an individual supplied evidence phrase from merchant_evidence without inventing anything.
 * For example:
 * "Merchant only has a generic transaction receipt" -> "Transaction receipt"
 * "account activity" -> "Account activity"
 * "Renewal invoice" -> "Renewal invoice"
 * "payment processor capture log" -> "Payment processor capture log"
 */
function cleanSuppliedEvidenceItem(raw: string): string {
  let s = raw.trim();
  // Remove trailing punctuation
  s = s.replace(/[.;,]+$/, '').trim();
  // Remove leading merchant/boilerplate verbs
  s = s
    .replace(
      /^(?:the\s+)?(?:merchant\s+)?(?:only\s+)?(?:has|have|submitted|provided|supplied|possesses|includes|attached)\s+(?:only\s+)?(?:a\s+|an\s+|the\s+)?/i,
      ''
    )
    .trim();
  // Remove leading "a / an / the"
  s = s.replace(/^(?:a|an|the)\s+/i, '').trim();
  // Normalize "generic transaction receipt" -> "Transaction receipt" so it cleanly names the document type
  s = s.replace(/^generic\s+(?=transaction\s+receipt)/i, '').trim();
  return capitalizeFirst(s);
}

/**
 * Cleans an individual missing evidence phrase extracted from a negated clause or backend reasoning.
 */
function cleanMissingEvidenceItem(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[.;,]+$/, '').trim();
  s = s
    .replace(
      /^(?:with\s+no|without\s+any|without|no|missing|lacking\s+any|lacking|failed\s+to\s+provide\s+necessary|failed\s+to\s+provide|lack\s+of)\s+/i,
      ''
    )
    .trim();
  s = s
    .replace(
      /\s+(?:attached|provided|supplied|available|on\s+file|for\s+an?\s+\$[\d.]+\s+.*|to\s+refute.*|in\s+the\s+submission.*)$/i,
      ''
    )
    .trim();
  s = s.replace(/^(?:any|a|an|the|necessary)\s+/i, '').trim();
  return capitalizeFirst(s);
}

/**
 * Splits a conjunction list like "A, B, and C" or "A or B" into clean individual items.
 */
function splitConjunctionItems(clause: string): string[] {
  const normalized = clause
    .replace(/\s*,\s*(?:and|or|nor)\s+/gi, ' | ')
    .replace(/\s+(?:and|or|nor)\s+/gi, ' | ')
    .replace(/\s*,\s*/g, ' | ');

  return normalized
    .split('|')
    .map((p) => p.trim())
    .filter((p) => p.length > 2);
}

/**
 * Parses actual supplied merchant_evidence into:
 * 1. Supplied items (AVAILABLE)
 * 2. Explicitly absent items mentioned in negated clauses of merchant_evidence (MISSING)
 * Never invents evidence that was not in the input.
 */
export function parseMerchantEvidenceText(merchantEvidence: string): {
  suppliedItems: string[];
  rawSuppliedItems: string[];
  negatedMissingItems: string[];
} {
  const trimmed = (merchantEvidence || '').trim();
  if (
    !trimmed ||
    /^(?:none|no\s+evidence|no\s+merchant\s+evidence|n\/a|nothing)\.?$/i.test(
      trimmed
    )
  ) {
    return {
      suppliedItems: [],
      rawSuppliedItems: [],
      negatedMissingItems: [],
    };
  }

  const suppliedItems: string[] = [];
  const rawSuppliedItems: string[] = [];
  const negatedMissingItems: string[] = [];

  // Split by semicolon or sentence boundary, or by ", with no " / ", without " / "; no "
  const negativeSplitRegex =
    /(?:[,;]\s*|\s+)(?=(?:with\s+no\b|without\s+any\b|without\b|lacking\b|missing\b|no\s+[^.;,]+\s+(?:attached|provided|supplied|available|on\s+file)\b))/i;

  const subClauses = trimmed
    .split(negativeSplitRegex)
    .map((c) => c.trim())
    .filter(Boolean);

  subClauses.forEach((clause) => {
    const isNegatedClause =
      /^(?:with\s+no\b|without\b|lacking\b|missing\b|no\s+)/i.test(clause) ||
      /\bno\s+[^.;,]+\s+(?:attached|provided|supplied|available|on\s+file)\b/i.test(
        clause
      );

    if (isNegatedClause) {
      const cleanedNegClause = cleanMissingEvidenceItem(clause);
      const parts = splitConjunctionItems(cleanedNegClause);
      parts.forEach((part) => {
        const item = cleanMissingEvidenceItem(part);
        if (
          item &&
          !negatedMissingItems.some(
            (existing) => existing.toLowerCase() === item.toLowerCase()
          )
        ) {
          negatedMissingItems.push(item);
        }
      });
    } else {
      const rawClause = clause
        .replace(/[.;,]+$/, '')
        .replace(
          /^(?:the\s+)?(?:merchant\s+)?(?:only\s+)?(?:has|have|submitted|provided|supplied|possesses|includes|attached)\s+(?:only\s+)?(?:a\s+|an\s+|the\s+)?/i,
          ''
        )
        .trim();

      const parts = splitConjunctionItems(rawClause);
      parts.forEach((part) => {
        const rawCleaned = capitalizeFirst(
          part.replace(/^(?:a|an|the)\s+/i, '').trim()
        );
        const item = cleanSuppliedEvidenceItem(part);
        if (
          item &&
          !suppliedItems.some(
            (existing) => existing.toLowerCase() === item.toLowerCase()
          )
        ) {
          suppliedItems.push(item);
          rawSuppliedItems.push(rawCleaned || item);
        }
      });
    }
  });

  return { suppliedItems, rawSuppliedItems, negatedMissingItems };
}

/**
 * Extracts missing evidence items referenced in the backend's reasoning or memory_used text
 * (e.g., "without cancellation records and customer communication",
 * "failed to provide cancellation records and customer communication").
 */
function extractMissingFromReasoning(
  reasoning: string,
  memoryUsedText?: string,
  precedentLesson?: string
): string[] {
  const combined = [reasoning, memoryUsedText || '', precedentLesson || '']
    .filter(Boolean)
    .join(' ');

  const extracted: string[] = [];

  const patterns = [
    /(?:failed\s+to\s+provide(?:\s+necessary)?|without|lack\s+of|missing)\s+([^.;,]+?)(?:\s+for\s+an?\b|\s+as\s+evidence\b|\s+in\s+case\b|[.,;]|$)/gi,
  ];

  for (const regex of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(combined)) !== null) {
      const candidatePhrase = match[1].trim();
      const parts = splitConjunctionItems(candidatePhrase);
      parts.forEach((part) => {
        const cleaned = cleanMissingEvidenceItem(part);
        if (
          cleaned &&
          cleaned.length >= 4 &&
          cleaned.length <= 65 &&
          !/^(?:it|them|this|that|sufficient\s+evidence|evidence)$/i.test(
            cleaned
          ) &&
          !extracted.some((e) => e.toLowerCase() === cleaned.toLowerCase())
        ) {
          extracted.push(cleaned);
        }
      });
    }
  }

  return extracted;
}

/**
 * Generates a factual, non-legalistic explanation ("Why this evidence matters")
 * using the actual evidence item, dispute type, and backend reasoning.
 * Never uses legal advisor guarantees ("guarantees a win", "legally correct", etc.).
 */
function buildEvidenceImpactExplanation(
  label: string,
  status: EvidenceStatusBadge,
  disputeType: string,
  reasoning: string
): string {
  const lower = label.toLowerCase();
  const reasoningLower = (reasoning || '').toLowerCase();

  if (lower.includes('cancellation')) {
    if (lower.includes('policy') || lower.includes('terms')) {
      return 'Helps establish the renewal and cancellation terms disclosed to the customer.';
    }
    return 'Helps establish whether cancellation occurred before the renewal or billing date.';
  }

  if (
    lower.includes('communication') ||
    lower.includes('correspondence') ||
    lower.includes('email') ||
    lower.includes('chat') ||
    lower.includes('support')
  ) {
    return "Helps establish the customer's cancellation or support request and the merchant's response.";
  }

  if (lower.includes('3ds') || lower.includes('authentication')) {
    return 'Supports the dispute analysis by documenting cardholder authentication during checkout.';
  }

  if (
    lower.includes('ip') ||
    lower.includes('geolocation') ||
    lower.includes('billing')
  ) {
    return 'Supports the dispute analysis by comparing transaction location and billing details.';
  }

  if (lower.includes('session') || lower.includes('login')) {
    return 'Documents account access and session activity around the time of the transaction.';
  }

  if (
    lower.includes('receipt') ||
    lower.includes('invoice') ||
    lower.includes('capture')
  ) {
    if (
      reasoningLower.includes('insufficient') ||
      reasoningLower.includes('lacking') ||
      reasoningLower.includes('only has')
    ) {
      return 'Documents that the charge was processed, though the analysis notes transaction records alone may not resolve cancellation claims.';
    }
    return 'Documents that the transaction was processed and billed to the account.';
  }

  if (lower.includes('account activity') || lower.includes('usage')) {
    return 'Supports the dispute analysis by showing account status and activity associated with the service.';
  }

  if (status === 'AVAILABLE') {
    return `Supplied merchant evidence supporting the ${disputeType.toLowerCase()} dispute evaluation.`;
  }
  if (status === 'MISSING') {
    return `Identified as an evidence gap in the current ${disputeType.toLowerCase()} dispute analysis.`;
  }
  if (status === 'WEAK') {
    return 'Identified by the analysis as having limited weight without supporting documentation.';
  }
  return 'Relevant evidence that could strengthen the case if available for submission.';
}

/**
 * Builds the complete structured Evidence Intelligence model for a dispute analysis.
 */
export function buildEvidenceIntelligence(params: {
  caseId: string;
  disputeType: string;
  merchantEvidence: string;
  reasoning: string;
  memoryUsed: boolean;
  memoryUsedSummary?: string;
  evidenceToSubmit: string[];
  strongEvidence?: string[];
  weakEvidence?: string[];
  missingEvidence?: string[];
  baselineEvidenceToSubmit?: string[];
  evidenceStrategy?: string;
  displayedPrecedents: ConsolidatedPrecedent[];
  excludedCurrentCasePrecedents: ConsolidatedPrecedent[];
}): EvidenceIntelligenceData {
  const {
    caseId,
    disputeType,
    merchantEvidence,
    reasoning,
    memoryUsed,
    memoryUsedSummary,
    evidenceToSubmit,
    strongEvidence = [],
    weakEvidence = [],
    missingEvidence = [],
    baselineEvidenceToSubmit = [],
    evidenceStrategy,
    displayedPrecedents,
    excludedCurrentCasePrecedents,
  } = params;

  // 1. Parse actual merchant_evidence provided in the current dispute
  const parsedFromInput = parseMerchantEvidenceText(merchantEvidence);

  const availableLabels =
    strongEvidence.length > 0 ? strongEvidence : parsedFromInput.suppliedItems;

  const availableEvidence: StructuredEvidenceEntry[] = availableLabels.map(
    (label, idx) => ({
      id: `avail-${idx}-${label}`,
      label,
      status: 'AVAILABLE',
      whyItMatters: buildEvidenceImpactExplanation(
        label,
        'AVAILABLE',
        disputeType,
        reasoning
      ),
    })
  );

  // 2. Identify MISSING and WEAK evidence from explicit backend fields, current dispute text, and AI reasoning
  const primaryPrecedent =
    displayedPrecedents[0] ?? excludedCurrentCasePrecedents[0];

  const reasoningMissing = extractMissingFromReasoning(
    reasoning,
    memoryUsedSummary,
    primaryPrecedent?.consolidatedLesson
  );

  const combinedMissingLabels: string[] = [];
  const pushUniqueMissing = (item: string) => {
    const cleaned = cleanMissingEvidenceItem(item);
    if (!cleaned) return;
    // Never mark an item as MISSING if it is already in AVAILABLE
    const isAlreadyAvailable = availableEvidence.some(
      (avail) => avail.label.toLowerCase() === cleaned.toLowerCase()
    );
    if (isAlreadyAvailable) return;
    if (
      !combinedMissingLabels.some(
        (existing) => existing.toLowerCase() === cleaned.toLowerCase()
      )
    ) {
      combinedMissingLabels.push(cleaned);
    }
  };

  if (missingEvidence.length > 0) {
    missingEvidence.forEach(pushUniqueMissing);
  } else {
    parsedFromInput.negatedMissingItems.forEach(pushUniqueMissing);
    if (combinedMissingLabels.length === 0) {
      reasoningMissing.forEach(pushUniqueMissing);
    }
  }

  const missingEntries: StructuredEvidenceEntry[] = combinedMissingLabels.map(
    (label, idx) => ({
      id: `missing-${idx}-${label}`,
      label,
      status: 'MISSING',
      whyItMatters: buildEvidenceImpactExplanation(
        label,
        'MISSING',
        disputeType,
        reasoning
      ),
    })
  );

  const weakEntries: StructuredEvidenceEntry[] = weakEvidence.map(
    (label, idx) => ({
      id: `weak-${idx}-${label}`,
      label: capitalizeFirst(label),
      status: 'WEAK',
      whyItMatters: buildEvidenceImpactExplanation(
        label,
        'WEAK',
        disputeType,
        reasoning
      ),
    })
  );

  // 3. Recommended evidence (strictly from backend evidence_to_submit, never presented as already available)
  const recommendedEntries: StructuredEvidenceEntry[] = evidenceToSubmit.map(
    (label, idx) => ({
      id: `rec-${idx}-${label}`,
      label: capitalizeFirst(label),
      status: 'RECOMMENDED',
      whyItMatters: buildEvidenceImpactExplanation(
        label,
        'RECOMMENDED',
        disputeType,
        reasoning
      ),
    })
  );

  // 4. Connect Evidence to Hindsight Memory (HINDSIGHT-IDENTIFIED EVIDENCE GAP)
  // Only connect to an actual prior historical precedent case distinct from the current case ID
  let hindsightEvidenceGap: HindsightIdentifiedEvidenceGap | null = null;
  const historicalPrecedent = displayedPrecedents.find(
    (p) => p.caseId.toUpperCase() !== caseId.toUpperCase()
  );

  if (memoryUsed && historicalPrecedent) {
    const precedentMissingItems = extractMissingFromReasoning(
      '',
      memoryUsedSummary,
      historicalPrecedent.consolidatedLesson
    );

    const gapItems =
      precedentMissingItems.length > 0
        ? precedentMissingItems
        : combinedMissingLabels;

    if (gapItems.length > 0) {
      const formattedList =
        gapItems.length === 1
          ? gapItems[0]
          : gapItems.length === 2
          ? `${gapItems[0]} and ${gapItems[1].toLowerCase()}`
          : `${gapItems.slice(0, -1).join(', ')}, and ${gapItems[
              gapItems.length - 1
            ].toLowerCase()}`;

      hindsightEvidenceGap = {
        previousCaseId: historicalPrecedent.caseId,
        historicalOutcome: historicalPrecedent.outcome || 'LOST',
        lesson: `${capitalizeFirst(formattedList)} ${
          gapItems.length === 1 ? 'was' : 'were'
        } missing.`,
        currentCaseId: caseId,
        potentialEvidenceGap: `${capitalizeFirst(formattedList)}.`,
      };
    }
  }

  // 5. Connect Evidence to Memory Impact (WITHOUT HINDSIGHT vs WITH HINDSIGHT evidence strategy)
  const withoutHindsightList =
    baselineEvidenceToSubmit.length > 0
      ? baselineEvidenceToSubmit
      : parsedFromInput.rawSuppliedItems.length > 0
      ? parsedFromInput.rawSuppliedItems
      : availableEvidence.map((a) => a.label);

  // What Hindsight-assisted reasoning emphasizes (missing precedent evidence or evidence_to_submit)
  const withHindsightList =
    combinedMissingLabels.length > 0
      ? combinedMissingLabels
      : evidenceToSubmit.slice(0, 3);

  const normalizedWithout = withoutHindsightList
    .map((s) => s.toLowerCase().trim())
    .sort()
    .join('|');
  const normalizedWith = withHindsightList
    .map((s) => s.toLowerCase().trim())
    .sort()
    .join('|');

  const strategyChanged =
    Boolean(memoryUsed) &&
    withoutHindsightList.length > 0 &&
    withHindsightList.length > 0 &&
    normalizedWithout !== normalizedWith;

  return {
    availableEvidence,
    missingEvidence: missingEntries,
    weakEvidence: weakEntries,
    recommendedEvidence: recommendedEntries,
    coverage: {
      available: availableEvidence.length,
      missing: missingEntries.length,
      weak: weakEntries.length,
      recommended: recommendedEntries.length,
    },
    hindsightEvidenceGap,
    evidenceStrategyComparison: {
      strategyChanged,
      withoutHindsightEvidence: withoutHindsightList,
      withHindsightEvidence: withHindsightList,
      evidenceStrategyText: evidenceStrategy,
    },
    evidenceStrategyText: evidenceStrategy,
  };
}
