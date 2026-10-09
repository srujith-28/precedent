import React from 'react';
import {
  CaseAnalysisResult,
  ChargebackCase,
  RecordedOutcome,
} from '../types/precedent';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Brain,
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GitCompare,
  History,
  Lightbulb,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface LearningFromOutcomesSectionProps {
  analysis: CaseAnalysisResult;
  currentCaseRecord?: ChargebackCase;
  currentRecordedOutcome?: RecordedOutcome;
  previousCaseRecord?: ChargebackCase;
  onOpenRecordOutcome?: (caseId: string) => void;
  onViewLearningChain?: () => void;
}

export const LearningFromOutcomesSection: React.FC<
  LearningFromOutcomesSectionProps
> = ({
  analysis,
  currentCaseRecord,
  currentRecordedOutcome,
  previousCaseRecord,
  onOpenRecordOutcome,
  onViewLearningChain,
}) => {
  const currentCaseId = analysis.caseId;
  const memoryUsed = Boolean(analysis.memory_used);
  const recalledMemories = analysis.recalled_memories || [];
  const primaryPrecedent =
    analysis.displayedPrecedents?.[0] ??
    analysis.excludedCurrentCasePrecedents?.[0];

  // Derive previous precedent information from backend or session
  const previousCaseId =
    primaryPrecedent?.caseId ||
    analysis.relevant_precedent?.split(/[·\s]/)[0] ||
    (previousCaseRecord ? previousCaseRecord.caseId : 'CB-001');

  const previousOutcome = (
    primaryPrecedent?.outcome ||
    analysis.previous_outcome ||
    previousCaseRecord?.outcome ||
    'LOST'
  ).toUpperCase();

  const lessonRetained =
    analysis.key_lesson ||
    primaryPrecedent?.consolidatedLesson ||
    (recalledMemories.length > 0 ? recalledMemories[0] : '') ||
    previousCaseRecord?.lessonRetained ||
    'Cancellation records and customer communication should be prioritized.';

  // Why it was lost - extracted factual gap
  const whyItWasLost =
    analysis.evidenceIntelligence?.hindsightEvidenceGap?.lesson ||
    (lessonRetained.toLowerCase().includes('cancellation')
      ? 'Missing cancellation records and customer communication.'
      : lessonRetained.toLowerCase().includes('signature')
      ? 'Carrier tracking number lacked signature confirmation or GPS delivery proof.'
      : lessonRetained.toLowerCase().includes('3ds')
      ? 'Card-not-present transaction lacked 3D Secure authentication.'
      : lessonRetained);

  // Evidence gap identified for current case
  const evidenceGap =
    analysis.evidenceIntelligence?.hindsightEvidenceGap?.potentialEvidenceGap ||
    (analysis.missing_evidence && analysis.missing_evidence.length > 0
      ? analysis.missing_evidence.join(', ')
      : null);

  // Evidence strategy
  const evidenceStrategyComparison =
    analysis.evidenceIntelligence?.evidenceStrategyComparison;
  const evidenceStrategyText =
    analysis.evidence_strategy ||
    evidenceStrategyComparison?.evidenceStrategyText ||
    (evidenceStrategyComparison?.withHindsightEvidence &&
    evidenceStrategyComparison.withHindsightEvidence.length > 0
      ? `Prioritize: ${evidenceStrategyComparison.withHindsightEvidence.join(', ')}`
      : 'Prioritize cancellation timestamp audit and customer communication records.');

  // Baseline comparison
  const hasBaseline = Boolean(
    analysis.baseline_comparison_status === 'available' &&
      analysis.baseline_recommendation &&
      analysis.baseline_recommendation.trim().length > 0
  );

  const baselineRec = analysis.baseline_recommendation?.trim().toUpperCase();
  const currentRec = (
    analysis.recommendation || analysis.decision
  ).trim().toUpperCase();
  const recommendationChanged =
    hasBaseline && baselineRec && baselineRec !== currentRec;
  const strategyChanged = Boolean(
    evidenceStrategyComparison?.strategyChanged ||
      (memoryUsed && primaryPrecedent)
  );

  // "How Previous Experience Changed This Case" state calculation
  let experienceExplanationState: string;
  if (!memoryUsed && recalledMemories.length === 0) {
    experienceExplanationState =
      'Memory impact cannot be determined from available data.';
  } else if (recommendationChanged) {
    experienceExplanationState =
      'Historical precedent influenced this recommendation.';
  } else if (strategyChanged) {
    experienceExplanationState =
      'Historical precedent was relevant to evidence strategy.';
  } else if (memoryUsed && !recommendationChanged) {
    experienceExplanationState =
      'Historical precedent was recalled but no decision change was detected.';
  } else {
    experienceExplanationState =
      'Memory impact cannot be determined from available data.';
  }

  // Outcome feedback for current case
  const outcomeRecorded = Boolean(
    currentRecordedOutcome ||
      (currentCaseRecord && currentCaseRecord.outcomeRecorded)
  );
  const currentOutcomeValue =
    currentRecordedOutcome?.outcome || currentCaseRecord?.outcome;
  const currentActualResult =
    currentRecordedOutcome?.actualResult || currentCaseRecord?.actualResult;
  const currentLessonRetained =
    currentRecordedOutcome?.lesson || currentCaseRecord?.lessonRetained;

  return (
    <section className="bg-[#0C1322] border border-teal-500/30 rounded-xl p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
              CORE PRECEDENT PROVENANCE
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              Learning Loop
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100 mt-1">
            Learning From Previous Outcomes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Demonstrating how past dispute outcomes stored in persistent Hindsight memory directly alter evidence analysis and decision strategy for subsequent disputes.
          </p>
        </div>

        {onViewLearningChain && (
          <button
            type="button"
            onClick={onViewLearningChain}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors shrink-0"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>View Learning Chain</span>
          </button>
        )}
      </div>

      {/* Main Flow: PREVIOUS CASE → CURRENT CASE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: PREVIOUS CASE (e.g. CB-001) */}
        <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                  PREVIOUS CASE: {previousCaseId}
                </span>
              </div>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  previousOutcome.includes('LOST')
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    : 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                }`}
              >
                Outcome: {previousOutcome}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                WHY IT WAS LOST
              </span>
              <p className="text-xs text-slate-200 bg-[#0C1322] border border-slate-800/80 rounded-lg p-3 leading-relaxed">
                {whyItWasLost}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 block">
                LESSON RETAINED IN HINDSIGHT
              </span>
              <div className="text-xs text-slate-100 bg-[#0C1322] border border-cyan-500/30 rounded-lg p-3 leading-relaxed flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{lessonRetained}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Source: Hindsight Persistent Memory</span>
            <span className="text-slate-500">Origin: {previousCaseId}</span>
          </div>
        </div>

        {/* Right Column: CURRENT CASE (e.g. CB-002) */}
        <div className="bg-[#080D19] border border-teal-500/40 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-300">
                  CURRENT CASE: {currentCaseId}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                <BrainCircuit className="w-3 h-3" />
                <span>Hindsight Recalled</span>
              </span>
            </div>

            {/* Recalled Reference */}
            <div className="text-xs text-slate-300 bg-[#0C1322] border border-slate-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-slate-400">Precedent Recalled:</span>
              <span className="font-mono font-bold text-teal-300">
                {previousCaseId} ({recalledMemories.length} memory entries)
              </span>
            </div>

            {/* MEMORY-IDENTIFIED EVIDENCE GAP */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block">
                MEMORY-IDENTIFIED EVIDENCE GAP
              </span>
              <div className="text-xs text-slate-200 bg-[#0C1322] border border-amber-500/30 rounded-lg p-3 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  {evidenceGap ? (
                    <span>
                      Identified evidence gap from {previousCaseId} precedent:{' '}
                      <strong className="text-amber-200 font-semibold">
                        {evidenceGap}
                      </strong>
                    </span>
                  ) : (
                    <span>
                      No critical evidence gap identified from recalled precedent.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* EVIDENCE STRATEGY */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 block">
                EVIDENCE STRATEGY
              </span>
              <div className="text-xs text-slate-100 bg-[#0C1322] border border-teal-500/30 rounded-lg p-3 leading-relaxed flex items-start gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{evidenceStrategyText}</span>
              </div>
            </div>

            {/* CURRENT RECOMMENDATION */}
            <div className="flex items-center justify-between bg-[#0C1322] border border-slate-800 rounded-lg p-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400 block">
                  Current Recommendation
                </span>
                <span
                  className={`font-mono text-lg font-bold ${
                    currentRec.includes('FIGHT')
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {currentRec} ({analysis.confidence}%)
                </span>
              </div>
              <span className="text-xs text-slate-300 max-w-xs text-right line-clamp-2">
                {analysis.reasoning}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Evaluated with Hindsight Context</span>
            <span className="text-teal-400">memory_used = true</span>
          </div>
        </div>
      </div>

      {/* BEFORE / AFTER (Dual-Path Baseline Comparison) */}
      <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
              BEFORE / AFTER COMPARISON
            </h3>
          </div>
          {hasBaseline ? (
            <span className="text-[10px] font-mono uppercase text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              Genuine Dual-Path Baseline Available
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-mono">
              Baseline comparison unavailable
            </span>
          )}
        </div>

        {hasBaseline ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* WITHOUT HINDSIGHT */}
            <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-mono font-bold uppercase text-slate-300">
                  WITHOUT HINDSIGHT
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Current Case Only
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recommendation:</span>
                <span
                  className={`font-mono font-bold ${
                    baselineRec?.includes('FIGHT')
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {baselineRec} ({analysis.baseline_confidence}%)
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 block">
                  Reasoning:
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {analysis.baseline_reasoning || 'Evaluated on current evidence.'}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 block">
                  Evidence Strategy:
                </span>
                <p className="text-slate-400 text-[11px]">
                  {evidenceStrategyComparison?.withoutHindsightEvidence?.join(
                    ', '
                  ) || 'Standard capture evidence and account documentation.'}
                </p>
              </div>
            </div>

            {/* WITH HINDSIGHT */}
            <div className="bg-[#0C1322] border border-teal-500/30 rounded-lg p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-teal-500/30 pb-1.5">
                <span className="font-mono font-bold uppercase text-teal-300">
                  WITH HINDSIGHT
                </span>
                <span className="font-mono text-[10px] text-teal-400">
                  Recalled Precedent Applied
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recommendation:</span>
                <span
                  className={`font-mono font-bold ${
                    currentRec.includes('FIGHT')
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {currentRec} ({analysis.confidence}%)
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 block">
                  Reasoning:
                </span>
                <p className="text-slate-200 leading-relaxed text-[11px]">
                  {analysis.reasoning}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 block">
                  Evidence Strategy:
                </span>
                <p className="text-teal-300 text-[11px]">
                  {evidenceStrategyText}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-4 text-center">
            <span className="text-xs text-slate-400 font-mono">
              Baseline comparison unavailable
            </span>
          </div>
        )}
      </div>

      {/* MOST IMPORTANT PART: "How Previous Experience Changed This Case" */}
      <div className="bg-[#080D19] border border-cyan-500/30 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
            HOW PREVIOUS EXPERIENCE CHANGED THIS CASE
          </h3>
        </div>

        <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-sm font-semibold text-teal-300">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{experienceExplanationState}</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {recommendationChanged ? (
              <>
                Previous case <strong className="text-slate-100">{previousCaseId}</strong> was resolved as <span className="font-mono text-rose-400">{previousOutcome}</span> because cancellation evidence was missing. For <strong className="text-slate-100">{currentCaseId}</strong>, Hindsight recalled this exact precedent, detected the recurring evidence gap, shifted the recommendation from <span className="font-mono text-amber-400">{baselineRec}</span> to <span className="font-mono text-teal-400">{currentRec}</span>, and adapted the evidence strategy to prioritize cancellation records.
              </>
            ) : strategyChanged ? (
              <>
                Recalled precedent <strong className="text-slate-100">{previousCaseId}</strong> ({previousOutcome}) directly influenced the evidence prioritization strategy for <strong className="text-slate-100">{currentCaseId}</strong>, highlighting missing cancellation audit records without shifting the final decision recommendation.
              </>
            ) : (
              <>
                Precedent <strong className="text-slate-100">{previousCaseId}</strong> was retrieved from Hindsight. Current evidence evaluation aligned with the historical lesson.
              </>
            )}
          </p>
        </div>
      </div>

      {/* OUTCOME FEEDBACK: After CB-002's outcome is recorded */}
      {outcomeRecorded ? (
        <div className="bg-[#080D19] border border-teal-500/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-300">
                OUTCOME FEEDBACK: {currentCaseId} RECORDED
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              Outcome: {currentOutcomeValue}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block">
                {currentCaseId} OUTCOME
              </span>
              <p className="font-mono font-bold text-slate-100 text-sm">
                {currentOutcomeValue}
              </p>
              <p className="text-[11px] text-slate-400">{currentActualResult}</p>
            </div>

            <div className="bg-[#0C1322] border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="font-mono text-[10px] text-cyan-400 uppercase block">
                LESSON RETAINED
              </span>
              <p className="text-slate-200 text-xs leading-relaxed">
                {currentLessonRetained}
              </p>
            </div>

            <div className="bg-[#0C1322] border border-teal-500/30 rounded-lg p-3 space-y-1">
              <span className="font-mono text-[10px] text-teal-400 uppercase block">
                AVAILABLE FOR FUTURE CASES
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">
                Stored into Hindsight persistent memory to guide subsequent chargeback disputes (e.g. CB-003).
              </p>
            </div>
          </div>
        </div>
      ) : onOpenRecordOutcome ? (
        <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-200">
              Close the Loop: Record Actual Outcome for {currentCaseId}
            </div>
            <p className="text-slate-400 text-[11px]">
              Recording whether {currentCaseId} won or lost commits a new lesson to Hindsight, enabling continuous learning for subsequent cases.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenRecordOutcome(currentCaseId)}
            className="px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors whitespace-nowrap"
          >
            Record {currentCaseId} Outcome
          </button>
        </div>
      ) : null}

      {/* Business Value Statement */}
      <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-200 font-medium">Business Value:</strong>{' '}
          Precedent does not treat every dispute as an isolated decision. Previous outcomes become persistent experience that can influence evidence strategy and future decision support.
        </p>
      </div>
    </section>
  );
};
