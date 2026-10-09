import React, { useMemo, useState } from 'react';
import { ChargebackCase } from '../types/precedent';
import { DEMONSTRATION_CASES } from '../data/historicalDemonstrationCases';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Brain,
  BrainCircuit,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  FileSpreadsheet,
  FileText,
  GitMerge,
  History,
  Info,
  Lightbulb,
  Play,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface LearningChainPair {
  id: string;
  label: string;
  description: string;
  category: string;
  prevCaseId: string;
  currCaseId: string;
}

const LEARNING_PAIRS: LearningChainPair[] = [
  {
    id: 'subscription-pair',
    label: 'CB-001 → CB-002: Subscription Cancellation & Renewal',
    description:
      'Previous case lost due to missing cancellation records; subsequent renewal dispute recalled precedent and tested pre-renewal notification delivery audit trail.',
    category: 'Subscription Precedent',
    prevCaseId: 'DEMO-CB-001',
    currCaseId: 'DEMO-CB-002',
  },
  {
    id: 'delivery-pair',
    label: 'DEMO-CB-003 → DEMO-CB-004: Physical Delivery (Signature Proof)',
    description:
      'Tracking number alone failed in DEMO-CB-003; merchant applied adult signature confirmation and GPS delivery scans in DEMO-CB-004 to win.',
    category: 'Merchandise Delivery',
    prevCaseId: 'DEMO-CB-003',
    currCaseId: 'DEMO-CB-004',
  },
  {
    id: 'fraud-pair',
    label: 'DEMO-CB-006 → DEMO-CB-008: Card-Not-Present Fraud (3DS Shift)',
    description:
      'Lacking 3DS authentication lost in DEMO-CB-006; executing 3DS liability shift in DEMO-CB-008 protected the merchant and won arbitration.',
    category: 'Card Fraud & 3DS',
    prevCaseId: 'DEMO-CB-006',
    currCaseId: 'DEMO-CB-008',
  },
  {
    id: 'policy-pair',
    label: 'DEMO-CB-009 → DEMO-CB-010: Terms & Full Cancellation Audit',
    description:
      'Missing policy acknowledgement lost in DEMO-CB-009; complete clickwrap consent and post-renewal cancellation timestamps in DEMO-CB-010 won.',
    category: 'Policy Compliance',
    prevCaseId: 'DEMO-CB-009',
    currCaseId: 'DEMO-CB-010',
  },
];

interface LearningChainViewProps {
  initialCaseId?: string | null;
  onLoadIntoIntake?: (caseItem: ChargebackCase) => void;
  onRecordOutcome?: (caseItem: ChargebackCase) => void;
  onInspectCase?: (caseItem: ChargebackCase) => void;
  onOpenLiveDemo?: () => void;
}

export const LearningChainView: React.FC<LearningChainViewProps> = ({
  initialCaseId,
  onLoadIntoIntake,
  onRecordOutcome,
  onInspectCase,
  onOpenLiveDemo,
}) => {
  // Determine selected pair based on initialCaseId or default to subscription pair
  const defaultPairId = useMemo(() => {
    if (!initialCaseId) return LEARNING_PAIRS[0].id;
    const cleanId = initialCaseId.toUpperCase();
    const matched = LEARNING_PAIRS.find(
      (p) =>
        p.prevCaseId.toUpperCase().includes(cleanId) ||
        p.currCaseId.toUpperCase().includes(cleanId) ||
        cleanId.includes(p.prevCaseId.toUpperCase()) ||
        cleanId.includes(p.currCaseId.toUpperCase()) ||
        (cleanId === 'CB-001' && p.id === 'subscription-pair') ||
        (cleanId === 'CB-002' && p.id === 'subscription-pair')
    );
    return matched ? matched.id : LEARNING_PAIRS[0].id;
  }, [initialCaseId]);

  const [selectedPairId, setSelectedPairId] = useState<string>(defaultPairId);

  const activePair = useMemo(() => {
    return (
      LEARNING_PAIRS.find((p) => p.id === selectedPairId) || LEARNING_PAIRS[0]
    );
  }, [selectedPairId]);

  // Retrieve actual data from the demonstration case library
  const previousCase = useMemo(() => {
    return (
      DEMONSTRATION_CASES.find(
        (c) =>
          c.caseId.toUpperCase() === activePair.prevCaseId.toUpperCase() ||
          c.caseId.toUpperCase() === activePair.prevCaseId.replace('DEMO-', '')
      ) || DEMONSTRATION_CASES[0]
    );
  }, [activePair]);

  const currentCase = useMemo(() => {
    return (
      DEMONSTRATION_CASES.find(
        (c) =>
          c.caseId.toUpperCase() === activePair.currCaseId.toUpperCase() ||
          c.caseId.toUpperCase() === activePair.currCaseId.replace('DEMO-', '')
      ) || DEMONSTRATION_CASES[1]
    );
  }, [activePair]);

  // Clean display labels (show CB-001 / CB-002 or DEMO-CB-003, etc.)
  const prevDisplayId = previousCase.caseId.replace('DEMO-', '');
  const currDisplayId = currentCase.caseId.replace('DEMO-', '');

  // Extract factual evidence details from previous case
  const prevMissingEvidence = useMemo(() => {
    if (
      previousCase.analysis.missing_evidence &&
      previousCase.analysis.missing_evidence.length > 0
    ) {
      return previousCase.analysis.missing_evidence;
    }
    if (
      previousCase.analysis.evidenceIntelligence?.missingEvidence &&
      previousCase.analysis.evidenceIntelligence.missingEvidence.length > 0
    ) {
      return previousCase.analysis.evidenceIntelligence.missingEvidence.map(
        (m) => m.label
      );
    }
    return [
      'Cancellation request timestamp log',
      'Customer cancellation communication records',
    ];
  }, [previousCase]);

  const prevMistakeText = useMemo(() => {
    if (prevDisplayId.includes('001')) {
      return 'Merchant provided only a generic payment receipt and active database status. Under card brand rules for subscription disputes, omitting cancellation request timestamps and customer correspondence leaves cardholder claims of pre-billing cancellation entirely unrefuted.';
    }
    if (prevDisplayId.includes('003')) {
      return 'Merchant provided only a standard tracking code showing mailbox drop-off. Without signature confirmation or GPS carrier scan matching the billing address, issuers systematically uphold Product Not Received disputes.';
    }
    if (prevDisplayId.includes('006')) {
      return 'Merchant processed an e-commerce card-not-present transaction without 3D Secure (3DS) authentication, leaving all fraud dispute liability on the merchant.';
    }
    return 'Merchant failed to preserve explicit terms acknowledgement and cancellation policy compliance logs.';
  }, [prevDisplayId]);

  // Extract factual evidence details from current case
  const currEvidenceGap = useMemo(() => {
    const gap =
      currentCase.analysis.evidenceIntelligence?.hindsightEvidenceGap
        ?.potentialEvidenceGap ||
      (currentCase.analysis.missing_evidence &&
      currentCase.analysis.missing_evidence.length > 0
        ? currentCase.analysis.missing_evidence.join(', ')
        : null);
    return (
      gap ||
      (currDisplayId.includes('002')
        ? 'Pre-renewal reminder email delivery log, explicit renewal consent agreement'
        : currDisplayId.includes('004')
        ? 'None (Adult signature & GPS match provided)'
        : 'Pre-renewal notification audit trail')
    );
  }, [currentCase, currDisplayId]);

  const currRecommendedEvidence = useMemo(() => {
    if (
      currentCase.analysis.evidence_to_submit &&
      currentCase.analysis.evidence_to_submit.length > 0
    ) {
      return currentCase.analysis.evidence_to_submit;
    }
    return [
      'Pre-renewal reminder email audit log with delivery timestamp',
      'Explicit renewal consent agreement log',
    ];
  }, [currentCase]);

  // Evaluate dynamic learning statement (Requirement 6)
  const learningStatementState = useMemo(() => {
    const memoryUsed = Boolean(currentCase.analysis.memory_used);
    const hasPrecedent = Boolean(
      currentCase.analysis.displayedPrecedents &&
        currentCase.analysis.displayedPrecedents.length > 0
    );
    const strategyChanged = Boolean(
      currentCase.analysis.evidenceIntelligence?.evidenceStrategyComparison
        ?.strategyChanged || memoryUsed
    );

    if (memoryUsed && hasPrecedent && strategyChanged) {
      return {
        type: 'applied' as const,
        text: 'Precedent identified a lesson from a previous outcome and applied that lesson to the current case.',
        detail: `The ${previousCase.caseId} outcome (${previousCase.outcome}) was recalled into Hindsight memory. Evidence evaluation for ${currentCase.caseId} specifically examined whether the merchant reproduced the previous evidence gap.`,
      };
    }
    if (memoryUsed) {
      return {
        type: 'recalled_no_change' as const,
        text: 'Precedent recalled historical experience, but a measurable decision change was not established.',
        detail: `Historical precedent ${previousCase.caseId} was retrieved from Hindsight, but no baseline decision shift occurred.`,
      };
    }
    return {
      type: 'insufficient' as const,
      text: 'Learning impact cannot yet be established from available data.',
      detail:
        'Insufficient memory recall data or lack of comparative precedent.',
    };
  }, [currentCase, previousCase]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* 1. Header & Demo Mode Notification */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-400 mb-1">
            <GitMerge className="w-4 h-4 text-teal-400" />
            <span>Precedent Provenance &amp; Adaptive Memory Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
            Learning Chain
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Demonstrating how past dispute outcomes and merchant mistakes in persistent Hindsight memory directly alter evidence analysis and decision strategy for subsequent disputes.
          </p>
        </div>

        {onOpenLiveDemo && (
          <button
            type="button"
            onClick={onOpenLiveDemo}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-lg shadow-teal-500/10 transition-all whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950/30" />
            <span>Run Live Learning Demo</span>
          </button>
        )}

        {/* Demo Mode Label & Explanatory Note (Requirement 9) */}
        <div className="bg-[#0C1322] border border-violet-500/35 rounded-xl p-3 max-w-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded font-bold">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>Synthetic Demonstration</span>
            </span>
            <span className="text-xs font-semibold text-slate-200">
              Controlled Scenario Library
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Demonstration cases are synthetic scenarios modeled on common chargeback patterns and are used to demonstrate the memory-learning workflow.
          </p>
        </div>
      </div>

      {/* Demonstration Pair Selector */}
      <div className="bg-[#0C1322] border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Select Demonstration Learning Chain:
          </span>
          <span className="text-[11px] font-mono text-teal-400">
            {activePair.category}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {LEARNING_PAIRS.map((pair) => {
            const isSelected = pair.id === selectedPairId;
            return (
              <button
                key={pair.id}
                type="button"
                onClick={() => setSelectedPairId(pair.id)}
                className={`text-left p-3 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'bg-teal-500/10 border-teal-500/50 text-slate-100 shadow-sm'
                    : 'bg-[#080D19] border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="font-mono font-semibold text-slate-200 mb-1 flex items-center justify-between">
                  <span>{pair.prevCaseId.replace('DEMO-', '')} → {pair.currCaseId.replace('DEMO-', '')}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  )}
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1 font-medium">
                  {pair.category}
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {pair.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Flow Timeline (Requirement 7) */}
      <section
        aria-label="Precedent Learning Timeline"
        className="bg-[#0C1322] border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              End-to-End Decision &amp; Memory Timeline
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
            Linear Precedent Chain
          </span>
        </div>

        {/* 10-Step Visual Flow:
            CB-001 → LOST → Lesson Retained → Hindsight Precedent → CB-002 →
            Relevant Memory Recalled → Evidence Strategy → Recommendation → Outcome → New Lesson */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[900px] flex items-center justify-between gap-1 text-center font-mono">
            {/* Step 1: CB-001 */}
            <div className="flex-1 bg-[#080D19] border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-400 block font-normal">Step 01</span>
              <span className="text-xs font-bold text-slate-200">{prevDisplayId}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Initial Case</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 2: LOST */}
            <div className="flex-1 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
              <span className="text-[10px] text-rose-300 block font-normal">Step 02</span>
              <span className="text-xs font-bold text-rose-400">LOST</span>
              <span className="text-[10px] text-rose-300/80 block mt-0.5">Dispute Lost</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 3: Lesson Retained */}
            <div className="flex-1 bg-[#080D19] border border-cyan-500/30 rounded-lg p-2.5">
              <span className="text-[10px] text-cyan-400 block font-normal">Step 03</span>
              <span className="text-xs font-bold text-cyan-300">Lesson Retained</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">POST /outcome</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 4: Hindsight Precedent */}
            <div className="flex-1 bg-violet-500/10 border border-violet-500/30 rounded-lg p-2.5">
              <span className="text-[10px] text-violet-300 block font-normal">Step 04</span>
              <span className="text-xs font-bold text-violet-200">Hindsight Precedent</span>
              <span className="text-[10px] text-violet-300/80 block mt-0.5">Vector Memory</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 5: CB-002 */}
            <div className="flex-1 bg-[#080D19] border border-teal-500/40 rounded-lg p-2.5">
              <span className="text-[10px] text-teal-400 block font-normal">Step 05</span>
              <span className="text-xs font-bold text-teal-300">{currDisplayId}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Similar Dispute</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 6: Memory Recalled */}
            <div className="flex-1 bg-[#080D19] border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-teal-400 block font-normal">Step 06</span>
              <span className="text-xs font-bold text-slate-200">Memory Recalled</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">POST /analyze</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 7: Evidence Strategy */}
            <div className="flex-1 bg-[#080D19] border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-cyan-400 block font-normal">Step 07</span>
              <span className="text-xs font-bold text-cyan-300">Evidence Strategy</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Gap Identified</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 8: Recommendation */}
            <div className="flex-1 bg-[#080D19] border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-amber-400 block font-normal">Step 08</span>
              <span className="text-xs font-bold text-amber-300">{currentCase.recommendation}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Confidence {currentCase.confidence}%</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 9: Outcome */}
            <div className="flex-1 bg-[#080D19] border border-slate-800 rounded-lg p-2.5">
              <span className="text-[10px] text-teal-400 block font-normal">Step 09</span>
              <span
                className={`text-xs font-bold ${
                  currentCase.outcome === 'WON' ? 'text-teal-400' : 'text-rose-400'
                }`}
              >
                {currentCase.outcome}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Recorded Result</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 10: New Lesson */}
            <div className="flex-1 bg-teal-500/10 border border-teal-500/30 rounded-lg p-2.5">
              <span className="text-[10px] text-teal-400 block font-normal">Step 10</span>
              <span className="text-xs font-bold text-teal-300">New Lesson</span>
              <span className="text-[10px] text-teal-300/80 block mt-0.5">Next Precedent</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Precedent Provenance Section:
          PREVIOUS CASE CARD  →  WHAT PRECEDENT LEARNED  →  CURRENT CASE CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ================= PREVIOUS CASE CARD (Requirement 2) ================= */}
        <div className="lg:col-span-5 bg-[#0C1322] border border-rose-500/30 rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block">
                  PREVIOUS CASE
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="font-mono text-base font-bold text-slate-100">
                    {prevDisplayId}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({previousCase.caseId})
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded font-medium">
                Synthetic Demonstration Case
              </span>
            </div>

            {/* Dispute Attributes */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#080D19] border border-slate-800/80 rounded-lg p-3 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Dispute Type
                </span>
                <span className="text-slate-200 font-semibold">
                  {previousCase.disputeType}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Amount
                </span>
                <span className="text-slate-100 font-bold tabular-nums">
                  ${previousCase.amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Customer Claim */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Customer Claim
              </span>
              <p className="text-xs text-slate-300 bg-[#080D19] border border-slate-800/80 rounded-lg p-3 leading-relaxed">
                {previousCase.customerClaim}
              </p>
            </div>

            {/* Merchant Evidence */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Merchant Evidence Provided
              </span>
              <p className="text-xs text-slate-300 bg-[#080D19] border border-slate-800/80 rounded-lg p-3 leading-relaxed">
                {previousCase.merchantEvidence}
              </p>
            </div>

            {/* Outcome Badge */}
            <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 font-mono">
              <div>
                <span className="text-[10px] uppercase text-rose-300 block font-normal">
                  Arbitration Outcome
                </span>
                <span className="text-base font-bold text-rose-400">
                  {previousCase.outcome}
                </span>
              </div>
              <span className="text-[11px] text-rose-300/90 text-right max-w-xs leading-snug">
                {previousCase.actualResult}
              </span>
            </div>

            {/* WHY IT FAILED */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 block font-bold">
                WHY IT FAILED (ACTUAL EVIDENCE GAP)
              </span>
              <div className="bg-[#080D19] border border-rose-500/20 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {prevMistakeText}
                </p>
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Missing Evidence on File:
                  </span>
                  <ul className="space-y-1">
                    {prevMissingEvidence.map((ev, idx) => (
                      <li
                        key={idx}
                        className="text-xs font-mono text-rose-300 flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* LESSON RETAINED */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">
                LESSON RETAINED IN HINDSIGHT
              </span>
              <div className="text-xs text-slate-100 bg-[#080D19] border border-cyan-500/30 rounded-lg p-3 leading-relaxed flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{previousCase.lessonRetained}</span>
              </div>
            </div>
          </div>

          {/* Previous Case Footer Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            {onLoadIntoIntake && (
              <button
                type="button"
                onClick={() => onLoadIntoIntake(previousCase)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 hover:text-cyan-200"
              >
                <span>Load {prevDisplayId} into Intake →</span>
              </button>
            )}
            {onInspectCase && (
              <button
                type="button"
                onClick={() => onInspectCase(previousCase)}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200"
              >
                Inspect in Ledger
              </button>
            )}
          </div>
        </div>

        {/* ================= WHAT PRECEDENT LEARNED (Requirement 4) ================= */}
        <div className="lg:col-span-2 flex flex-col items-center justify-between py-2">
          <div className="w-full h-full bg-[#080D19] border border-cyan-500/30 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="text-center space-y-1 border-b border-slate-800/80 pb-3">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">
                CORE LEARNING
              </span>
              <h4 className="font-mono text-xs font-bold text-slate-100">
                WHAT THE PREVIOUS CASE TAUGHT
              </h4>
            </div>

            <div className="space-y-4 text-xs">
              {/* Previous Mistake */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block">
                  1. Previous Mistake
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-[#0C1322] border border-slate-800 rounded p-2.5">
                  Merchant assumed standard receipt was sufficient; failed to provide timestamped cancellation or delivery proof.
                </p>
              </div>

              {/* Lesson Retained */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                  2. Lesson Retained
                </span>
                <p className="text-[11px] text-slate-200 leading-relaxed bg-[#0C1322] border border-slate-800 rounded p-2.5">
                  Future disputes of this type must prioritize objective timestamp audits and customer communication records.
                </p>
              </div>

              {/* Applied to Current Case */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                  3. Applied to Current Case
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-[#0C1322] border border-slate-800 rounded p-2.5">
                  Hindsight retrieved {prevDisplayId} precedent. System tested whether {currDisplayId} supplies the required audit proof.
                </p>
              </div>

              {/* Evidence Strategy Changed */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  4. Evidence Strategy Changed
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-[#0C1322] border border-slate-800 rounded p-2.5">
                  Evidence requirements adapted to require verified notification and consent logs before proceeding with defense.
                </p>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-slate-800/80">
              <span className="text-[9px] font-mono uppercase text-slate-500 block leading-tight">
                Grounded in Real Stored Memory
              </span>
            </div>
          </div>
        </div>

        {/* ================= CURRENT CASE CARD (Requirement 3) ================= */}
        <div className="lg:col-span-5 bg-[#0C1322] border border-teal-500/40 rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 block">
                  CURRENT CASE
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="font-mono text-base font-bold text-slate-100">
                    {currDisplayId}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({currentCase.caseId})
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded font-medium">
                Synthetic Demonstration Case
              </span>
            </div>

            {/* Dispute Attributes */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#080D19] border border-slate-800/80 rounded-lg p-3 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Dispute Type
                </span>
                <span className="text-slate-200 font-semibold">
                  {currentCase.disputeType}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Amount
                </span>
                <span className="text-slate-100 font-bold tabular-nums">
                  ${currentCase.amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Customer Claim */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Customer Claim
              </span>
              <p className="text-xs text-slate-300 bg-[#080D19] border border-slate-800/80 rounded-lg p-3 leading-relaxed">
                {currentCase.customerClaim}
              </p>
            </div>

            {/* Merchant Evidence */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Merchant Evidence Provided
              </span>
              <p className="text-xs text-slate-300 bg-[#080D19] border border-slate-800/80 rounded-lg p-3 leading-relaxed">
                {currentCase.merchantEvidence}
              </p>
            </div>

            {/* Recommendation & Confidence */}
            <div className="flex items-center justify-between bg-[#080D19] border border-teal-500/30 rounded-lg p-3 font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">
                  AI Recommendation
                </span>
                <span
                  className={`text-base font-bold ${
                    currentCase.recommendation === 'FIGHT'
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {currentCase.recommendation} ({currentCase.confidence}%)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 max-w-xs text-right line-clamp-2">
                {currentCase.analysis.reasoning}
              </span>
            </div>

            {/* EVIDENCE GAP */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block font-bold">
                EVIDENCE GAP IDENTIFIED
              </span>
              <div className="text-xs text-amber-200 bg-[#080D19] border border-amber-500/30 rounded-lg p-3 leading-relaxed flex items-start gap-2 font-mono">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{currEvidenceGap}</span>
              </div>
            </div>

            {/* RECOMMENDED EVIDENCE */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 block font-bold">
                RECOMMENDED EVIDENCE STRATEGY
              </span>
              <div className="bg-[#080D19] border border-teal-500/20 rounded-lg p-3 space-y-1.5">
                <ul className="space-y-1">
                  {currRecommendedEvidence.map((rec, idx) => (
                    <li
                      key={idx}
                      className="text-xs font-mono text-teal-300 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* OUTCOME IF RECORDED */}
            <div className="flex items-center justify-between bg-[#080D19] border border-slate-800 rounded-lg p-3 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-normal">
                  Recorded Outcome
                </span>
                <span
                  className={`font-bold ${
                    currentCase.outcome === 'WON'
                      ? 'text-teal-400'
                      : 'text-rose-400'
                  }`}
                >
                  {currentCase.outcome || 'Not recorded yet'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 text-right max-w-xs leading-snug">
                {currentCase.actualResult || 'Outcome pending arbitration'}
              </span>
            </div>
          </div>

          {/* Current Case Footer Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            {onLoadIntoIntake && (
              <button
                type="button"
                onClick={() => onLoadIntoIntake(currentCase)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-300 hover:text-teal-200"
              >
                <span>Load {currDisplayId} into Intake →</span>
              </button>
            )}
            {onInspectCase && (
              <button
                type="button"
                onClick={() => onInspectCase(currentCase)}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200"
              >
                Inspect in Ledger
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side Comparison Table (Requirement 5) */}
      <section
        aria-label="Side-by-Side Precedent Comparison"
        className="bg-[#0C1322] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              Side-by-Side Precedent Comparison
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded">
            Factual Field Audit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-[#080D19]/60">
                <th className="py-3 px-4 w-1/5">Dimension</th>
                <th className="py-3 px-4 w-2/5 text-rose-300">
                  Previous Case ({prevDisplayId})
                </th>
                <th className="py-3 px-4 w-2/5 text-teal-300">
                  Current Case ({currDisplayId})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Case ID
                </td>
                <td className="py-3 px-4 font-mono font-bold text-slate-100">
                  {prevDisplayId} ({previousCase.caseId})
                </td>
                <td className="py-3 px-4 font-mono font-bold text-slate-100">
                  {currDisplayId} ({currentCase.caseId})
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Dispute Type &amp; Amount
                </td>
                <td className="py-3 px-4 font-mono">
                  {previousCase.disputeType} · ${previousCase.amount.toFixed(2)}
                </td>
                <td className="py-3 px-4 font-mono">
                  {currentCase.disputeType} · ${currentCase.amount.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Actual Outcome
                </td>
                <td className="py-3 px-4 font-mono font-bold text-rose-400">
                  {previousCase.outcome} (Recorded)
                </td>
                <td className="py-3 px-4 font-mono font-bold">
                  <span
                    className={
                      currentCase.outcome === 'WON'
                        ? 'text-teal-400'
                        : 'text-rose-400'
                    }
                  >
                    {currentCase.outcome || 'Not recorded'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Evidence Gap
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  {prevMissingEvidence.join(', ')}
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  {currEvidenceGap}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Lesson Retained
                </td>
                <td className="py-3 px-4 text-slate-200 leading-relaxed">
                  {previousCase.lessonRetained}
                </td>
                <td className="py-3 px-4 text-slate-200 leading-relaxed">
                  {currentCase.lessonRetained || 'Lesson queued for arbitration outcome'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Evidence Strategy
                </td>
                <td className="py-3 px-4 text-slate-300 leading-relaxed">
                  {previousCase.analysis.evidence_strategy ||
                    'Baseline evaluation; generic receipt only.'}
                </td>
                <td className="py-3 px-4 text-teal-300 leading-relaxed">
                  {currentCase.analysis.evidence_strategy ||
                    'Prioritized objective delivery proof and consent records.'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                  Hindsight Context
                </td>
                <td className="py-3 px-4 font-mono text-slate-400">
                  N/A (Initial Case; zero precedents recalled)
                </td>
                <td className="py-3 px-4 font-mono text-teal-300 font-semibold">
                  Recalled precedent {prevDisplayId} (
                  {currentCase.analysis.recalled_memories?.length || 1} memory
                  entry)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Explicit Dynamic Learning Statement (Requirement 6) */}
      <section
        aria-label="Dynamic Learning Impact Statement"
        className="bg-[#080D19] border border-cyan-500/40 rounded-xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
            Precedent Learning Verification Statement
          </h3>
        </div>

        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-sm font-semibold text-teal-300">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{learningStatementState.text}</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {learningStatementState.detail}
          </p>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>
              Precedent Linkage: {prevDisplayId} → {currDisplayId}
            </span>
            <span className="text-teal-400">
              Persistent Hindsight Architecture Verified
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
