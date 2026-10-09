import { MemoryEntry } from '../types/precedent';

export interface ConsolidatedPrecedent {
  id: string;
  caseId: string;
  hasReliableCaseId: boolean;
  disputeType: string;
  outcome?: 'WON' | 'LOST';
  consolidatedLesson: string;
  rawMemories: string[];
  rawMemoryCount: number;
  isCurrentCase: boolean;
  sourceType: 'RECALLED FROM HINDSIGHT' | 'RETAINED IN HINDSIGHT';
  timestamp: string;
}

export interface PrecedentConsolidationResult {
  /** All unique consolidated precedents after grouping by Case ID (excluding current case) */
  historicalPrecedents: ConsolidatedPrecedent[];
  /** Top 3–5 most relevant historical precedents to display */
  displayedPrecedents: ConsolidatedPrecedent[];
  /** Consolidated entries whose Case ID matches the currently analyzed case (excluded from historical precedents) */
  excludedCurrentCasePrecedents: ConsolidatedPrecedent[];
  /** Total unique Case IDs across all recalled memories */
  totalUniqueCasesCount: number;
  /** Number of unique historical precedents (excluding current case) */
  uniqueHistoricalPrecedentsCount: number;
  /** Total raw memory strings returned by Hindsight */
  rawMemoryCount: number;
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'were',
  'be',
  'been',
  'being',
  'that',
  'this',
  'it',
  'its',
  'case',
  'dispute',
  'chargeback',
  'precedent',
  'serves',
  'historical',
  'outcome',
]);

/**
 * Extracts an explicit Case ID (e.g. CB-001, CB-002) if present in a raw memory string.
 * Never invents a Case ID if none is present.
 */
export function parseCaseIdFromText(text: string): string | undefined {
  const match = text.match(/\b(CB-\d+|[A-Z]{2,6}-\d+)\b/i);
  return match ? match[1].toUpperCase() : undefined;
}

/**
 * Extracts explicit outcome (LOST or WON) from raw memory text if present.
 */
export function parseOutcomeFromText(
  text: string
): 'WON' | 'LOST' | undefined {
  if (/\b(lost|loss|unsuccessful)\b/i.test(text)) return 'LOST';
  if (/\b(won|win|successful)\b/i.test(text)) return 'WON';
  return undefined;
}

/**
 * Extracts explicit dispute type from raw memory text if present.
 */
export function parseDisputeTypeFromText(
  text: string,
  fallbackDisputeType: string
): string {
  if (/\bsubscription\b/i.test(text)) return 'Subscription';
  if (/\bfraud\b/i.test(text)) return 'Fraud';
  if (/\bproduct not received\b/i.test(text)) return 'Product Not Received';
  if (/\bnot as described\b/i.test(text)) return 'Not as Described';
  if (/\bduplicate\b/i.test(text)) return 'Duplicate Processing';
  return fallbackDisputeType || 'Subscription';
}

function getContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !STOP_WORDS.has(w) &&
        !/^[a-z]{2,6}\d+$/.test(w)
    );
}

/**
 * Checks if sentence A's content words are effectively a subset of sentence B's content words.
 */
function isSubsumedBy(sentenceA: string, sentenceB: string): boolean {
  const wordsA = getContentWords(sentenceA);
  const wordsB = new Set(getContentWords(sentenceB));
  if (wordsA.length === 0) return true;
  let matched = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) matched += 1;
  }
  return matched / wordsA.length >= 0.8;
}

/**
 * Strips Hindsight pipe metadata segments (e.g., "| When: 2026-09-29", "| Involving: merchant",
 * "| Lesson learned from case CB-001") while keeping factual clauses intact.
 */
function stripHindsightPipeMetadata(raw: string): string {
  const segments = raw
    .split('|')
    .map((seg) => seg.trim())
    .filter(Boolean);

  const factualSegments = segments.filter((seg) => {
    if (/^when\s*:/i.test(seg)) return false;
    if (/^involving\s*:/i.test(seg)) return false;
    if (/^lesson\s+learned\s+from\s+case\b/i.test(seg)) return false;
    return true;
  });

  return factualSegments.join(' ');
}

/**
 * Cleans boilerplate prefixes or pure meta-statements so the consolidated lesson
 * reads like a clean, factual precedent summary using only information from the memories.
 */
function cleanMemorySentence(raw: string, caseId?: string): string {
  let s = stripHindsightPipeMetadata(raw).trim();
  // Remove leading bullet or numbering
  s = s.replace(/^[-•*\d.)\s]+/, '').trim();
  // Remove leading "Case CB-001 (subscription):" style prefixes while preserving the sentence body
  if (caseId) {
    const escapedId = caseId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    s = s
      .replace(
        new RegExp(
          `^(?:in\\s+)?(?:case\\s+)?${escapedId}\\s*(?:\\([^)]*\\))?\\s*[:,-]\\s*`,
          'i'
        ),
        ''
      )
      .trim();
  }
  // Remove leading "Lesson:" or "Actual result:" labels if embedded
  s = s
    .replace(/^(?:lesson\s*learned|lesson|actual\s*result|result)\s*:\s*/i, '')
    .trim();
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) {
      s += '.';
    }
  }
  return s;
}

/**
 * Checks whether a sentence is purely a redundant meta-label (e.g. "CB-001 serves as a precedent."
 * or "Case CB-001 is established as a precedent...") whose facts are already displayed in the card header.
 */
function isPureMetaSentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  if (
    /(?:serves|established)\s+as\s+a\s+precedent/i.test(lower) &&
    !lower.includes('because') &&
    !lower.includes('should') &&
    !lower.includes('require') &&
    !lower.includes('missing') &&
    !lower.includes('failed')
  ) {
    return true;
  }
  if (
    /^(?:case\s+)?[a-z]{2,6}-\d+\s+(?:was|is)\s+(?:a\s+)?(?:subscription|fraud)?\s*(?:dispute|case|chargeback)?\s*(?:that\s+was\s+)?(?:lost|won)?\.?$/i.test(
      lower.trim()
    )
  ) {
    return true;
  }
  if (
    /^(?:the\s+)?outcome\s+(?:of\s+[a-z]{2,6}-\d+\s+)?was\s+(?:lost|won)\.?$/i.test(
      lower.trim()
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Consolidates multiple raw memory strings belonging to the same Case ID into a single
 * concise precedent lesson using ONLY facts present in the recalled memories.
 */
export function consolidateCaseMemories(
  rawMemories: string[],
  caseId?: string
): string {
  if (rawMemories.length === 0) return '';
  if (rawMemories.length === 1) {
    return cleanMemorySentence(rawMemories[0], caseId);
  }

  // Split raw memories into candidate sentences
  const candidateSentences: string[] = [];
  rawMemories.forEach((mem) => {
    const cleanedBlock = stripHindsightPipeMetadata(mem);
    const parts = cleanedBlock
      .split(/(?<=[.!?])\s+/)
      .map((p) => cleanMemorySentence(p, caseId))
      .filter(Boolean);
    parts.forEach((p) => {
      if (!isPureMetaSentence(p)) {
        candidateSentences.push(p);
      }
    });
  });

  if (candidateSentences.length === 0) {
    return cleanMemorySentence(rawMemories[0], caseId);
  }

  // Sort by information richness (number of content words descending) so more complete sentences
  // subsume fragmented partial sentences.
  const sortedByRichness = [...candidateSentences].sort(
    (a, b) => getContentWords(b).length - getContentWords(a).length
  );

  const distinctSentences: string[] = [];
  for (const candidate of sortedByRichness) {
    const alreadyCovered = distinctSentences.some((kept) =>
      isSubsumedBy(candidate, kept)
    );
    if (!alreadyCovered) {
      distinctSentences.push(candidate);
    }
  }

  // Order sentences logically:
  // 1. Root cause / outcome explanation (contains "because", "lost", "won", "missing", "only submitted", "failed")
  // 2. Actionable lesson / future directive (contains "future", "should", "must", "require", "improve")
  const causeSentences = distinctSentences.filter(
    (s) =>
      /\b(because|lost|loss|won|missing|unavailable|could not|only submitted|failed)\b/i.test(
        s
      ) && !/\b(future\s+.*should|future\s+.*require|to\s+improve\s+success)\b/i.test(s)
  );
  const directiveSentences = distinctSentences.filter((s) =>
    /\b(future|should|must|require|recommend|to improve success)\b/i.test(s)
  );
  const otherSentences = distinctSentences.filter(
    (s) => !causeSentences.includes(s) && !directiveSentences.includes(s)
  );

  const selected: string[] = [];
  if (causeSentences.length > 0) {
    selected.push(causeSentences[0]);
  }
  if (directiveSentences.length > 0) {
    if (
      selected.length === 0 ||
      !isSubsumedBy(directiveSentences[0], selected[0])
    ) {
      selected.push(directiveSentences[0]);
    }
  }
  if (selected.length === 0 && otherSentences.length > 0) {
    selected.push(otherSentences[0]);
  }

  return selected.slice(0, 2).join(' ');
}

/**
 * Ranks consolidated precedents based on real available context overlap
 * without inventing fake numerical scores.
 */
function computeRelevanceRank(
  precedent: ConsolidatedPrecedent,
  context: {
    disputeType: string;
    customerClaim?: string;
    merchantEvidence?: string;
  }
): number {
  let rank = 0;

  // 1. Matches current dispute type
  if (
    precedent.disputeType.toLowerCase() ===
    context.disputeType.trim().toLowerCase()
  ) {
    rank += 100;
  }

  // 2. Has an explicit historical outcome (LOST / WON)
  if (precedent.outcome === 'LOST' || precedent.outcome === 'WON') {
    rank += 50;
  }

  // 3. Has a reliable source Case ID
  if (precedent.hasReliableCaseId) {
    rank += 25;
  }

  // 4. Keyword overlap with current case's claim & evidence
  const contextWords = new Set(
    getContentWords(
      `${context.disputeType} ${context.customerClaim || ''} ${
        context.merchantEvidence || ''
      }`
    )
  );
  const precedentWords = getContentWords(precedent.consolidatedLesson);
  for (const w of precedentWords) {
    if (contextWords.has(w)) {
      rank += 5;
    }
  }

  return rank;
}

export const MAX_DISPLAYED_PRECEDENTS = 5;

/**
 * Processes raw recalled Hindsight memories into unique, consolidated, ranked precedents.
 */
export function buildConsolidatedPrecedents(params: {
  rawMemories: string[];
  currentCaseId: string;
  disputeType: string;
  customerClaim?: string;
  merchantEvidence?: string;
  previousOutcomeHint?: string;
  timestamp: string;
}): PrecedentConsolidationResult {
  const {
    rawMemories,
    currentCaseId,
    disputeType,
    customerClaim,
    merchantEvidence,
    previousOutcomeHint,
    timestamp,
  } = params;

  const normalizedCurrentCaseId = currentCaseId.trim().toUpperCase();

  if (!rawMemories || rawMemories.length === 0) {
    return {
      historicalPrecedents: [],
      displayedPrecedents: [],
      excludedCurrentCasePrecedents: [],
      totalUniqueCasesCount: 0,
      uniqueHistoricalPrecedentsCount: 0,
      rawMemoryCount: 0,
    };
  }

  // Step 1: Partition memories into those with explicit Case IDs and unattributed continuations
  const explicitGroups = new Map<string, string[]>();
  const unattributedMemories: string[] = [];

  rawMemories.forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const caseId = parseCaseIdFromText(trimmed);
    if (caseId) {
      const list = explicitGroups.get(caseId) || [];
      if (!list.includes(trimmed)) {
        list.push(trimmed);
      }
      explicitGroups.set(caseId, list);
    } else {
      if (!unattributedMemories.includes(trimmed)) {
        unattributedMemories.push(trimmed);
      }
    }
  });

  // Step 2: Associate unattributed continuation sentences with the matching explicit Case ID group
  if (unattributedMemories.length > 0) {
    const explicitCaseIds = Array.from(explicitGroups.keys());
    if (explicitCaseIds.length === 1) {
      const soleCaseId = explicitCaseIds[0];
      const existing = explicitGroups.get(soleCaseId) || [];
      explicitGroups.set(soleCaseId, [...existing, ...unattributedMemories]);
    } else if (explicitCaseIds.length > 1) {
      const leftoverUnattributed: string[] = [];
      unattributedMemories.forEach((unattr) => {
        const unattrWords = getContentWords(unattr);
        let bestCaseId: string | null = null;
        let bestOverlap = 0;

        for (const [cid, groupMems] of explicitGroups.entries()) {
          const groupWordSet = new Set(getContentWords(groupMems.join(' ')));
          let overlap = 0;
          for (const w of unattrWords) {
            if (groupWordSet.has(w)) overlap += 1;
          }
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestCaseId = cid;
          }
        }

        if (bestCaseId && bestOverlap > 0) {
          const list = explicitGroups.get(bestCaseId) || [];
          list.push(unattr);
          explicitGroups.set(bestCaseId, list);
        } else {
          leftoverUnattributed.push(unattr);
        }
      });

      if (leftoverUnattributed.length > 0) {
        explicitGroups.set('UNSPECIFIED_PRECEDENT', leftoverUnattributed);
      }
    } else {
      explicitGroups.set('UNSPECIFIED_PRECEDENT', unattributedMemories);
    }
  }

  // Step 3: Build one ConsolidatedPrecedent per unique Case ID group
  const allConsolidated: ConsolidatedPrecedent[] = [];

  for (const [groupKey, groupMemories] of explicitGroups.entries()) {
    const hasReliableCaseId = groupKey !== 'UNSPECIFIED_PRECEDENT';
    const displayCaseId = hasReliableCaseId ? groupKey : 'Prior Precedent';
    const combinedText = groupMemories.join(' ');

    const parsedOutcome =
      parseOutcomeFromText(combinedText) ||
      (previousOutcomeHint === 'WON' || previousOutcomeHint === 'LOST'
        ? previousOutcomeHint
        : undefined);

    const parsedDisputeType = parseDisputeTypeFromText(
      combinedText,
      disputeType
    );

    const consolidatedLesson = consolidateCaseMemories(
      groupMemories,
      hasReliableCaseId ? groupKey : undefined
    );

    const isCurrentCase =
      hasReliableCaseId &&
      Boolean(normalizedCurrentCaseId) &&
      groupKey.toUpperCase() === normalizedCurrentCaseId;

    allConsolidated.push({
      id: `precedent-${groupKey}-${Date.now()}`,
      caseId: displayCaseId,
      hasReliableCaseId,
      disputeType: parsedDisputeType,
      outcome: parsedOutcome,
      consolidatedLesson,
      rawMemories: groupMemories,
      rawMemoryCount: groupMemories.length,
      isCurrentCase,
      sourceType: 'RECALLED FROM HINDSIGHT',
      timestamp,
    });
  }

  // Step 4: Rank by relevance to the current dispute
  const rankedAll = [...allConsolidated].sort(
    (a, b) =>
      computeRelevanceRank(b, {
        disputeType,
        customerClaim,
        merchantEvidence,
      }) -
      computeRelevanceRank(a, {
        disputeType,
        customerClaim,
        merchantEvidence,
      })
  );

  // Step 5: Separate historical precedents from current-case self-matches
  const historicalPrecedents = rankedAll.filter((p) => !p.isCurrentCase);
  const excludedCurrentCasePrecedents = rankedAll.filter(
    (p) => p.isCurrentCase
  );

  // Step 6: Limit displayed precedents to top 3–5 unique cases
  const displayedPrecedents = historicalPrecedents.slice(
    0,
    MAX_DISPLAYED_PRECEDENTS
  );

  return {
    historicalPrecedents,
    displayedPrecedents,
    excludedCurrentCasePrecedents,
    totalUniqueCasesCount: allConsolidated.length,
    uniqueHistoricalPrecedentsCount: historicalPrecedents.length,
    rawMemoryCount: rawMemories.length,
  };
}

/**
 * Converts a ConsolidatedPrecedent into a MemoryEntry for backward compatibility
 * with components expecting MemoryEntry.
 */
export function consolidatedPrecedentToMemoryEntry(
  p: ConsolidatedPrecedent,
  analyzedCaseId: string
): MemoryEntry {
  return {
    id: p.id,
    memoryCode: p.caseId,
    caseIdOrigin: p.hasReliableCaseId ? p.caseId : undefined,
    patternTitle: p.hasReliableCaseId
      ? `${p.caseId} · ${p.disputeType}`
      : `Hindsight Precedent · ${p.disputeType}`,
    disputeType: p.disputeType,
    outcomeLearnedFrom: p.outcome,
    lesson: p.consolidatedLesson,
    rawMemories: p.rawMemories,
    rawMemoryCount: p.rawMemoryCount,
    relevanceContext: `Consolidated from ${p.rawMemoryCount} Hindsight memory ${
      p.rawMemoryCount === 1 ? 'entry' : 'entries'
    } during analysis of ${analyzedCaseId}`,
    sourceType: 'RECALLED FROM HINDSIGHT',
    timestamp: p.timestamp,
  };
}
