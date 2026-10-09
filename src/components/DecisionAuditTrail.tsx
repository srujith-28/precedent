import React, { useState } from 'react';
import {
  CaseAnalysisResult,
  DisputeDecision,
  RecordedOutcome,
  ChargebackCase,
} from '../types/precedent';
import {
  ArrowDown,
  ArrowRight,
  Brain,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  Lightbulb,
  Milestone,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface DecisionAuditTrailProps {
  analysis: CaseAnalysisResult;
  recordedOutcome?: RecordedOutcome | null;
  caseRecord?: ChargebackCase | null;
  onRecordOutcome?: (caseId: string) => void;
}

export const DecisionAuditTrail: React.FC<DecisionAuditTrailProps> = ({
  analysis,
  recordedOutcome,
  caseRecord,
  onRecordOutcome,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // 1. CURRENT CASE Data
  const caseId = analysis.caseId || '—';
  const disputeType = analysis.disputeType || 'Dispute';
  const customerClaim = analysis.customerClaim?.trim();
  const merchantEvidence = analysis.merchantEvidence?.trim();

  // 2. HINDSIGHT RECALL Data
  const memoryUsed = Boolean(analysis.memory_used);
  const recalledMemories = analysis.recalled_memories || [];
  const recalledCount = recalledMemories.length;
  const uniquePrecedentsCount = analysis.uniquePrecedentsCount ?? 0;

  // 3. PREVIOUS PRECEDENT Data
  const primaryPrecedent =
    analysis.displayedPrecedents?.[0] ??
    analysis.historicalPrecedents?.[0] ??
    analysis.excludedCurrentCasePrecedents?.[0];

  const previousCaseId =
    primaryPrecedent?.hasReliableCaseId && primaryPrecedent.caseId
      ? primaryPrecedent.caseId
      : analysis.evidenceIntelligence?.hindsightEvidenceGap?.previousCaseId ||
        null;

  const previousOutcome =
    analysis.previous_outcome ||
    primaryPrecedent?.outcome ||
    analysis.evidenceIntelligence?.hindsightEvidenceGap?.historicalOutcome ||
    null;

  const relevantLesson =
    analysis.key_lesson ||
    primaryPrecedent?.consolidatedLesson ||
    analysis.evidenceIntelligence?.hindsightEvidenceGap?.lesson ||
    (recalledMemories.length > 0 ? recalledMemories[0] : null);

  // 4. EVIDENCE GAP Data
  const evidenceIntel = analysis.evidenceIntelligence;
  const missingEvidenceList =
    evidenceIntel?.missingEvidence && evidenceIntel.missingEvidence.length > 0
      ? evidenceIntel.missingEvidence
      : (analysis.missing_evidence || []).map((m, idx) => ({
          id: `missing-${idx}`,
          label: m,
          status: 'MISSING' as const,
          whyItMatters: '',
        }));

  const hindsightGap = evidenceIntel?.hindsightEvidenceGap;

  // 5. EVIDENCE STRATEGY Data
  const availableEvidenceList =
    evidenceIntel?.availableEvidence && evidenceIntel.availableEvidence.length > 0
      ? evidenceIntel.availableEvidence
      : [];

  const recommendedEvidenceList =
    evidenceIntel?.recommendedEvidence && evidenceIntel.recommendedEvidence.length > 0
      ? evidenceIntel.recommendedEvidence
      : (analysis.evidence_to_submit || []).map((rec, idx) => ({
          id: `rec-${idx}`,
          label: rec,
          status: 'RECOMMENDED' as const,
          whyItMatters: '',
        }));

  const evidenceStrategyText =
    analysis.evidence_strategy ||
    evidenceIntel?.evidenceStrategyText ||
    evidenceIntel?.evidenceStrategyComparison?.evidenceStrategyText;

  // 6. DECISION Data
  const decision: DisputeDecision =
    (analysis.decision?.toUpperCase() as DisputeDecision) || 'FOLD';
  const confidence = analysis.confidence ?? 0;
  const reasoning = analysis.reasoning?.trim() || '';

  // 7. MEMORY IMPACT Data
  const hasBaseline = Boolean(
    analysis.baseline_recommendation &&
      analysis.baseline_recommendation.trim().length > 0
  );
  const baselineRec = analysis.baseline_recommendation?.trim();
  const baselineConfidence = analysis.baseline_confidence;
  const hindsightRec = analysis.recommendation || analysis.decision;
  const recommendationChanged =
    hasBaseline &&
    baselineRec &&
    baselineRec.toUpperCase() !== hindsightRec.toUpperCase();
  const confidenceDifference =
    hasBaseline && baselineConfidence !== undefined
      ? confidence - baselineConfidence
      : null;

  const strategyComparison = evidenceIntel?.evidenceStrategyComparison;
  const strategyChanged = strategyComparison?.strategyChanged;

  // 8. OUTCOME Data (from props or recorded in session)
  const actualOutcomeValue =
    recordedOutcome?.outcome ||
    (caseRecord?.outcomeRecorded ? caseRecord.outcome : null);

  const actualResultText =
    recordedOutcome?.actualResult || caseRecord?.actualResult || null;

  const outcomeLesson =
    recordedOutcome?.lesson || caseRecord?.lessonRetained || null;

  const outcomeRecorded = Boolean(actualOutcomeValue && actualOutcomeValue !== 'PENDING');

  // Top Audit Trail Summary strip values
  const memoryStatusLabel = memoryUsed ? 'Used' : 'Not Used';
  const precedentDisplay = previousCaseId
    ? previousCaseId
    : memoryUsed
    ? 'Recalled (General Pattern)'
    : 'None';
  const previousOutcomeDisplay = previousOutcome
    ? previousOutcome
    : memoryUsed
    ? 'Unspecified in record'
    : 'None';
  const evidenceGapDisplay =
    hindsightGap?.potentialEvidenceGap ||
    (missingEvidenceList.length > 0
      ? `${missingEvidenceList.length} gap${missingEvidenceList.length === 1 ? '' : 's'} identified`
      : 'None identified');
  const outcomeDisplay = outcomeRecorded
    ? `${actualOutcomeValue}`
    : 'Not Recorded';

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-800/20 transition-colors border-b border-slate-800/80"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Milestone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
                Decision Audit Trail
              </h3>
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                Case {caseId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete provenance chain: Case → Recall → Precedent → Evidence → Decision → Outcome → Memory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline-block">
            {isExpanded ? 'Collapse chain' : 'Expand chain'}
          </span>
          <div className="p-1 rounded bg-slate-800/60 text-slate-300">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {/* Audit Trail Concise Summary Strip */}
      <div className="px-6 py-3 bg-[#080D19] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Memory Status
          </span>
          <span
            className={`font-mono font-semibold ${
              memoryUsed ? 'text-teal-400' : 'text-slate-400'
            }`}
          >
            {memoryStatusLabel}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Precedent
          </span>
          <span className="font-mono font-medium text-slate-200 truncate block">
            {precedentDisplay}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Previous Outcome
          </span>
          <span
            className={`font-mono font-semibold ${
              previousOutcome === 'WON'
                ? 'text-teal-400'
                : previousOutcome === 'LOST'
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
          >
            {previousOutcomeDisplay}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Evidence Gap
          </span>
          <span className="text-slate-200 truncate block font-medium">
            {evidenceGapDisplay}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Actual Outcome
          </span>
          <span
            className={`font-mono font-semibold ${
              actualOutcomeValue === 'WON'
                ? 'text-teal-400'
                : actualOutcomeValue === 'LOST'
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
          >
            {outcomeDisplay}
          </span>
        </div>
      </div>

      {/* Vertical Timeline Body */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-teal-500/60 before:via-cyan-500/40 before:to-teal-500/60">
            {/* 1. CURRENT CASE */}
            <div className="relative group">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 border-teal-500 flex items-center justify-center text-teal-400 shadow-sm">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                      STAGE 01
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      CURRENT CASE
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-teal-400 font-semibold">{caseId}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{disputeType}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Customer Claim
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {customerClaim || <span className="text-slate-500 italic">No customer claim text provided.</span>}
                    </p>
                  </div>
                  <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Merchant Evidence Available
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {merchantEvidence || <span className="text-slate-500 italic">No merchant evidence text provided.</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. HINDSIGHT RECALL */}
            <div className="relative group">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 border-teal-500 flex items-center justify-center text-teal-400 shadow-sm">
                <BrainCircuit className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                      STAGE 02
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      HINDSIGHT RECALL
                    </h4>
                  </div>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                      memoryUsed
                        ? 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                        : 'text-slate-400 bg-slate-800/50 border-slate-700/60'
                    }`}
                  >
                    {memoryUsed ? 'Precedents Recalled' : 'No Precedents Recalled'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-slate-300">
                    <div>
                      <span className="text-slate-500">Memory Used:</span>{' '}
                      <span className="font-semibold text-slate-200 font-mono">
                        {memoryUsed ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Recalled Entries:</span>{' '}
                      <span className="font-semibold text-teal-400 font-mono">
                        {recalledCount}
                      </span>
                    </div>
                    {uniquePrecedentsCount > 0 && (
                      <div>
                        <span className="text-slate-500">Unique Precedent Cases:</span>{' '}
                        <span className="font-semibold text-cyan-300 font-mono">
                          {uniquePrecedentsCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {recalledMemories.length > 0 ? (
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-2 mt-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Relevant Recalled Memories ({recalledMemories.length})
                      </span>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                        {recalledMemories.map((mem, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="font-mono text-[11px] text-teal-300">
                              {mem}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 text-slate-400">
                      No historical memory entries were recalled for this dispute type or claim. Case evaluated independently.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. PREVIOUS PRECEDENT */}
            <div className="relative group">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 border-teal-500 flex items-center justify-center text-teal-400 shadow-sm">
                <History className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                      STAGE 03
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      PREVIOUS PRECEDENT
                    </h4>
                  </div>
                  {previousCaseId && (
                    <span className="font-mono text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded font-semibold">
                      {previousCaseId}
                    </span>
                  )}
                </div>

                {memoryUsed && (previousCaseId || relevantLesson || previousOutcome) ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Previous Case ID
                      </span>
                      <span className="font-mono font-semibold text-slate-200 text-sm">
                        {previousCaseId || 'Unspecified in record'}
                      </span>
                    </div>

                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Previous Outcome
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-sm ${
                            previousOutcome === 'WON'
                              ? 'text-teal-400'
                              : previousOutcome === 'LOST'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {previousOutcome || 'Unspecified in record'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1 md:col-span-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Relevant Lesson Learned
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {relevantLesson || 'No explicit lesson string extracted from memory.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 text-slate-400 text-xs">
                    No previous precedent was recalled from Hindsight for this case.
                  </div>
                )}
              </div>
            </div>

            {/* 4. EVIDENCE GAP */}
            <div className="relative group">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-sm">
                <FileQuestion className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      STAGE 04
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      EVIDENCE GAP
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    Missing / Weak Items ({missingEvidenceList.length})
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Missing/Weak Evidence from Current Case */}
                  {missingEvidenceList.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Identified Evidence Gaps in Current Case
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {missingEvidenceList.map((item) => (
                          <div
                            key={item.id}
                            className="bg-[#0C1322] border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-200 block">
                                {item.label}
                              </span>
                              {item.whyItMatters && (
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {item.whyItMatters}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 text-slate-400">
                      No explicit missing evidence gaps flagged for this dispute.
                    </div>
                  )}

                  {/* Hindsight-Identified Gap if supported by recalled precedent */}
                  {hindsightGap ? (
                    <div className="bg-[#120B0B] border border-amber-500/40 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px] font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>HINDSIGHT PRECEDENT CONNECTION</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Precedent from case{' '}
                        <strong className="text-teal-300 font-mono">
                          {hindsightGap.previousCaseId}
                        </strong>{' '}
                        (Outcome: {hindsightGap.historicalOutcome}) highlighted this potential gap:{' '}
                        <span className="text-amber-200 font-medium">
                          &quot;{hindsightGap.potentialEvidenceGap}&quot;
                        </span>
                        . Lesson: {hindsightGap.lesson}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 5. EVIDENCE STRATEGY */}
            <div className="relative group">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 border-cyan-500 flex items-center justify-center text-cyan-400 shadow-sm">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                      STAGE 05
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      EVIDENCE STRATEGY
                    </h4>
                  </div>
                  {strategyChanged !== undefined && (
                    <span
                      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${
                        strategyChanged
                          ? 'text-teal-300 bg-teal-500/10 border-teal-500/30'
                          : 'text-slate-400 bg-slate-800/50 border-slate-700/60'
                      }`}
                    >
                      {strategyChanged ? 'Strategy Shaped by Hindsight' : 'Standard Baseline Strategy'}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  {evidenceStrategyText && (
                    <div className="bg-[#0C1322] border border-cyan-500/30 rounded-lg p-3 text-slate-200 leading-relaxed">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1">
                        Strategy Summary
                      </span>
                      {evidenceStrategyText}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Available Evidence */}
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 block font-semibold">
                        Available Evidence ({availableEvidenceList.length})
                      </span>
                      {availableEvidenceList.length > 0 ? (
                        <ul className="space-y-1 list-disc list-inside text-slate-300">
                          {availableEvidenceList.map((item) => (
                            <li key={item.id} className="leading-relaxed">
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">
                          No distinct available evidence items parsed.
                        </p>
                      )}
                    </div>

                    {/* Recommended Evidence */}
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block font-semibold">
                        Recommended Evidence to Strengthen Case ({recommendedEvidenceList.length})
                      </span>
                      {recommendedEvidenceList.length > 0 ? (
                        <ul className="space-y-1 list-disc list-inside text-slate-300">
                          {recommendedEvidenceList.map((item) => (
                            <li key={item.id} className="leading-relaxed">
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">
                          No additional evidence recommended.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. AI RECOMMENDATION / DECISION */}
            <div className="relative group">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 flex items-center justify-center shadow-sm ${
                  decision === 'FIGHT'
                    ? 'border-teal-500 text-teal-400'
                    : 'border-amber-500 text-amber-400'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                      STAGE 06
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      DECISION
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                        decision === 'FIGHT'
                          ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {decision}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold tabular-nums">
                      {confidence}% Confidence
                    </span>
                  </div>
                </div>

                <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Reasoning
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {reasoning || 'No explicit reasoning string provided.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 7. MEMORY IMPACT */}
            <div className="relative group">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 border-purple-500 flex items-center justify-center text-purple-400 shadow-sm">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      STAGE 07
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      MEMORY IMPACT
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                    Comparative Delta
                  </span>
                </div>

                <div className="text-xs space-y-3">
                  {hasBaseline ? (
                    <div className="space-y-3">
                      {/* Transition banner */}
                      <div className="bg-[#0C1322] border border-purple-500/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <div className="flex items-baseline gap-1">
                            <span className="text-slate-400 text-[10px] uppercase">
                              Baseline:
                            </span>
                            <span
                              className={`font-bold ${
                                baselineRec?.toUpperCase().includes('FIGHT')
                                  ? 'text-teal-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {baselineRec}
                            </span>
                            {baselineConfidence !== undefined && (
                              <span className="text-slate-400 text-[11px]">
                                ({baselineConfidence}%)
                              </span>
                            )}
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />

                          <div className="flex items-baseline gap-1">
                            <span className="text-purple-300 text-[10px] uppercase">
                              Hindsight:
                            </span>
                            <span
                              className={`font-bold ${
                                hindsightRec.toUpperCase().includes('FIGHT')
                                  ? 'text-teal-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {hindsightRec}
                            </span>
                            <span className="text-slate-300 text-[11px]">
                              ({confidence}%)
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold ${
                            recommendationChanged
                              ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                              : 'text-teal-300 bg-teal-500/15 border border-teal-500/30'
                          }`}
                        >
                          {recommendationChanged
                            ? 'Recommendation Changed'
                            : 'Recommendation Preserved'}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">
                            Recommendation Shift
                          </span>
                          <span className="font-semibold text-slate-200">
                            {recommendationChanged
                              ? `${baselineRec} → ${hindsightRec}`
                              : 'No shift (consistent)'}
                          </span>
                        </div>

                        <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">
                            Confidence Delta
                          </span>
                          <span className="font-semibold text-slate-200">
                            {confidenceDifference !== null
                              ? `${confidenceDifference > 0 ? '+' : ''}${confidenceDifference}% (${baselineConfidence}% → ${confidence}%)`
                              : 'Same / Baseline confidence unavailable'}
                          </span>
                        </div>

                        <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">
                            Evidence Strategy
                          </span>
                          <span className="font-semibold text-slate-200">
                            {strategyChanged !== undefined
                              ? strategyChanged
                                ? 'Changed based on precedent'
                                : 'Unchanged from baseline'
                              : 'Derived from case requirements'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 text-slate-400">
                      Baseline comparison unavailable — no prior Hindsight precedents were recalled to form a comparative baseline delta.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 8. OUTCOME */}
            <div className="relative group">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 flex items-center justify-center shadow-sm ${
                  outcomeRecorded
                    ? actualOutcomeValue === 'WON'
                      ? 'border-teal-500 text-teal-400'
                      : 'border-amber-500 text-amber-400'
                    : 'border-slate-600 text-slate-500'
                }`}
              >
                {outcomeRecorded ? (
                  actualOutcomeValue === 'WON' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  )
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                      STAGE 08
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      ACTUAL OUTCOME
                    </h4>
                  </div>
                  <span
                    className={`font-mono text-xs px-2.5 py-0.5 rounded font-bold border ${
                      outcomeRecorded
                        ? actualOutcomeValue === 'WON'
                          ? 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-slate-400 bg-slate-800/50 border-slate-700/60'
                    }`}
                  >
                    {outcomeRecorded
                      ? `Outcome: ${actualOutcomeValue}`
                      : 'Outcome not recorded yet'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {outcomeRecorded ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                            Recorded Outcome
                          </span>
                          <span
                            className={`font-mono text-base font-bold ${
                              actualOutcomeValue === 'WON'
                                ? 'text-teal-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {actualOutcomeValue}
                          </span>
                        </div>

                        <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                            Arbitration Details / Resolution
                          </span>
                          <p className="text-slate-200 leading-relaxed">
                            {actualResultText || 'Outcome successfully logged.'}
                          </p>
                        </div>
                      </div>

                      {outcomeLesson && (
                        <div className="bg-[#0C1322] border border-teal-500/30 rounded-lg p-3 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 block">
                            Lesson Documented
                          </span>
                          <p className="text-slate-200 leading-relaxed">
                            {outcomeLesson}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-200">
                          Outcome not recorded yet
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                          Recording the actual result ({caseId}) enables Hindsight to store this dispute as future precedent.
                        </p>
                      </div>

                      {onRecordOutcome && (
                        <button
                          type="button"
                          onClick={() => onRecordOutcome(caseId)}
                          className="px-3 py-1.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors shrink-0"
                        >
                          Record Outcome ({caseId})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 9. NEW MEMORY / LEARNING */}
            <div className="relative group">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0C1322] border-2 flex items-center justify-center shadow-sm ${
                  outcomeRecorded
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-slate-700 text-slate-500'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      STAGE 09
                    </span>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      NEW MEMORY & PERSISTENCE
                    </h4>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${
                      outcomeRecorded
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-slate-400 bg-slate-800/50 border-slate-700/60'
                    }`}
                  >
                    {outcomeRecorded ? 'Retained in Hindsight' : 'Pending Outcome'}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  {outcomeRecorded ? (
                    <div className="bg-[#0C1322] border border-emerald-500/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold font-mono text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Precedent Successfully Retained in Hindsight</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        This case and its arbitration outcome (
                        <strong className="text-emerald-300">{actualOutcomeValue}</strong>
                        ) have been stored in Hindsight persistent memory. When subsequent disputes with similar customer claims or missing evidence patterns are analyzed, this case will be recalled as a precedent to shape future decisions.
                      </p>
                      {outcomeLesson && (
                        <div className="bg-[#080D19] border border-slate-800/80 rounded p-2 text-slate-300 font-mono text-[11px]">
                          <span className="text-slate-500 block text-[9px] uppercase">
                            Retained Lesson Entry:
                          </span>
                          &quot;{outcomeLesson}&quot;
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0C1322] border border-slate-800/60 rounded-lg p-3 text-slate-400">
                      Memory retention pending — once the arbitration outcome is recorded via{' '}
                      <code className="text-teal-400 font-mono">POST /outcome</code>, Hindsight retains the lesson as a persistent precedent for future disputes.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
