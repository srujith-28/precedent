import { ConsolidatedPrecedent } from '../utils/precedentConsolidator';
import { EvidenceIntelligenceData } from '../utils/evidenceIntelligence';

export type NavigationTab =
  | 'overview'
  | 'disputes'
  | 'payments'
  | 'checkout'
  | 'analyze'
  | 'history'
  | 'learning-chain'
  | 'memory'
  | 'outcomes'
  | 'analytics';

export type DisputeDecision = 'FIGHT' | 'FOLD';

export type CaseOutcome = 'WON' | 'LOST' | 'PENDING';

export type EvidenceStrength = 'STRONG' | 'WEAK' | 'MISSING' | 'UNCLASSIFIED';

export interface EvidenceItem {
  id: string;
  label: string;
  category: string;
  strength: EvidenceStrength;
  status: 'PRESENT' | 'RECOMMENDED' | 'CRITICAL_GAP';
  description: string;
}

export interface MemoryEntry {
  id: string;
  memoryCode: string;
  caseIdOrigin?: string;
  patternTitle: string;
  disputeType: string;
  outcomeLearnedFrom?: 'WON' | 'LOST';
  actualResult?: string;
  lesson: string;
  rawMemories?: string[];
  rawMemoryCount?: number;
  relevanceContext: string;
  sourceType: 'RECALLED FROM HINDSIGHT' | 'RETAINED IN HINDSIGHT';
  timestamp: string;
}

export interface CaseAnalysisResult {
  caseId: string;
  disputeType?: string;
  customerClaim?: string;
  merchantEvidence?: string;
  decision: DisputeDecision;
  recommendation: string;
  confidence: number;
  evidence_to_submit: string[];
  strong_evidence?: string[];
  weak_evidence?: string[];
  missing_evidence?: string[];
  hasExplicitEvidenceCategories: boolean;
  reasoning: string;
  memory_used: boolean;
  memory_used_summary?: string;
  /** Raw recalled memory entries returned by Hindsight (preserved intact) */
  recalled_memories: string[];
  /** Consolidated unique historical precedents (excluding current Case ID) */
  historicalPrecedents: ConsolidatedPrecedent[];
  /** Top 3–5 most relevant unique historical precedents to display */
  displayedPrecedents: ConsolidatedPrecedent[];
  /** Consolidated memory entries matching the current Case ID (excluded from historical precedents) */
  excludedCurrentCasePrecedents: ConsolidatedPrecedent[];
  /** Total unique Case IDs after grouping recalled memories */
  uniquePrecedentsCount: number;
  /** Count of unique prior historical precedents excluding current Case ID */
  historicalPrecedentsCount: number;
  /** Structured Evidence Intelligence (Available, Missing/Weak, Recommended, Impact, Hindsight Gap, Coverage) */
  evidenceIntelligence: EvidenceIntelligenceData;
  evidence_strategy?: string;
  recommendedEvidence: EvidenceItem[];
  hindsightMemoryUsed: MemoryEntry[];
  improvedByMemory: boolean;
  analyzedAt: string;
  // Optional fields for "Memory Impact" & "DecisionCard" (WITHOUT HINDSIGHT vs WITH HINDSIGHT)
  baseline_recommendation?: string;
  baseline_confidence?: number;
  baseline_reasoning?: string;
  baseline_comparison?: string;
  baseline_comparison_status?: 'available' | 'unavailable';
  hindsight_recommendation?: string;
  hindsight_confidence?: number;
  hindsight_reasoning?: string;
  previous_outcome?: string;
  relevant_precedent?: string;
  key_lesson?: string;
}

export interface ChargebackCase {
  id: string;
  caseId: string;
  disputeType: string;
  amount: number;
  customerClaim: string;
  merchantEvidence: string;
  decision: DisputeDecision;
  recommendation: string;
  confidence: number;
  outcome: CaseOutcome;
  outcomeRecorded: boolean;
  actualResult?: string;
  lessonRetained?: string;
  submittedAt: string;
  analysis: CaseAnalysisResult;
  /** Explicitly marks synthetic demonstration cases vs live analyzed cases */
  isSyntheticDemo?: boolean;
}

export interface RecordedOutcome {
  id: string;
  caseId: string;
  disputeType?: string;
  predictedRecommendation?: string;
  outcome: 'WON' | 'LOST';
  actualResult: string;
  lesson: string;
  recordedAt: string;
  /** Explicitly marks synthetic demonstration outcomes */
  isSyntheticDemo?: boolean;
}

export interface CaseFormInput {
  caseId: string;
  disputeType: string;
  amount: string;
  customerClaim: string;
  merchantEvidence: string;
}

export interface OutcomeFormInput {
  caseId: string;
  outcome: 'LOST' | 'WON';
  actualResult: string;
  lesson: string;
}

export type ConnectionState = 'checking' | 'connected' | 'disconnected';

export interface HealthStatusResponse {
  status: string;
  hindsight?: {
    status: 'connected' | 'disconnected' | 'unavailable';
    detail?: string;
  };
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}
