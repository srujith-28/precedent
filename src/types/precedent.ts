export type NavigationTab = 'dashboard' | 'analyze' | 'history' | 'memory';

export type DataMode = 'live' | 'demo';

export type DisputeDecision = 'FIGHT' | 'FOLD';

export type CaseOutcome = 'WON' | 'LOST' | 'FOLDED' | 'PENDING';

export interface EvidenceItem {
  id: string;
  label: string;
  category: string;
  status: 'PRESENT' | 'RECOMMENDED' | 'CRITICAL_GAP';
  description: string;
  isDemo?: boolean;
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
  recommendedAction: string;
  recalledCount: number;
  casesImprovedCount: number;
  lastUpdated: string;
  isDemo?: boolean;
}

export interface CaseAnalysisResult {
  caseId: string;
  decision: DisputeDecision;
  recommendation: string;
  confidence: number;
  evidence_to_submit: string[];
  reasoning: string;
  memory_used: boolean;
  recalled_memories: string[];
  recommendedEvidence: EvidenceItem[];
  hindsightMemoryUsed: MemoryEntry[];
  improvedByMemory: boolean;
  analyzedAt: string;
  previous_outcome?: string | null;
  isDemo?: boolean;
}

export interface ChargebackCase {
  id: string;
  caseId: string;
  disputeType: string;
  amount: number;
  customerClaim: string;
  merchantEvidence: string;
  decision: DisputeDecision;
  confidence: number;
  outcome: CaseOutcome;
  actualResult?: string;
  lessonRetained?: string;
  submittedAt: string;
  analysis: CaseAnalysisResult;
  isDemo?: boolean;
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
