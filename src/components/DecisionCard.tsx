import React from 'react';
import { CaseAnalysisResult } from '../types/precedent';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GitCompare,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface DecisionCardProps {
  analysis: CaseAnalysisResult;
  disputeAmount: number;
  outcomeRecorded?: boolean;
  recordedOutcomeValue?: 'WON' | 'LOST' | 'PENDING';
  onOpenOutcomeForm?: (caseId: string) => void;
  onStartNewCase?: () => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  analysis,
  disputeAmount,
  outcomeRecorded = false,
  recordedOutcomeValue,
  onOpenOutcomeForm,
  onStartNewCase,
}) => {
  const isFight = analysis.decision === 'FIGHT';
  const rawCount = analysis.recalled_memories.length;
  const uniquePrecedents = analysis.uniquePrecedentsCount ?? 0;

  const hasHindsightMemory = Boolean(
    analysis.memory_used &&
      analysis.recalled_memories &&
      analysis.recalled_memories.length > 0
  );

  const hasBaselineComparison = Boolean(
    hasHindsightMemory &&
      analysis.baseline_recommendation &&
      analysis.baseline_recommendation.trim().length > 0 &&
      analysis.baseline_comparison_status !== 'unavailable'
  );

  const baselineRec = analysis.baseline_recommendation;
  const isBaselineFight = baselineRec?.toUpperCase().includes('FIGHT');
  const recommendationShifted =
    Boolean(baselineRec) &&
    baselineRec?.toUpperCase() !== analysis.decision.toUpperCase();

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
      {/* Top Executive Verdict Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span className="font-bold text-slate-200">
              Case {analysis.caseId}
            </span>
            <span aria-hidden="true">·</span>
            <span>{analysis.analyzedAt}</span>
            {outcomeRecorded &&
            (recordedOutcomeValue === 'WON' ||
              recordedOutcomeValue === 'LOST') ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                  recordedOutcomeValue === 'WON'
                    ? 'text-teal-300 border-teal-500/30 bg-teal-500/10'
                    : 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  Outcome Retained in Hindsight: {recordedOutcomeValue}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber-300 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
                <Clock className="w-3 h-3" />
                <span>
                  Current Case · Outcome Not Yet Recorded in Hindsight
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
                isFight
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {isFight ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Recommendation
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className={`font-mono text-3xl font-bold tracking-tight ${
                    isFight ? 'text-teal-400' : 'text-amber-400'
                  }`}
                >
                  {analysis.decision}
                </span>
                {analysis.recommendation !== analysis.decision && (
                  <span className="text-sm font-medium text-slate-300">
                    {analysis.recommendation}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenOutcomeForm && (
            <button
              type="button"
              onClick={() => onOpenOutcomeForm(analysis.caseId)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 transition-colors whitespace-nowrap"
            >
              <span>
                {outcomeRecorded
                  ? `Update Outcome (${analysis.caseId})`
                  : `Record Outcome (${analysis.caseId})`}
              </span>
            </button>
          )}
          {onStartNewCase && (
            <button
              type="button"
              onClick={onStartNewCase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#070B14] border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>New Case</span>
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics Strip: Confidence, Disputed Amount, Unique Precedents & Raw Memories Recalled */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="text-xs text-slate-400">Confidence</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">
              {analysis.confidence}%
            </span>
            <div className="flex-1 max-w-[80px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isFight ? 'bg-teal-400' : 'bg-amber-400'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, analysis.confidence))}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Disputed Amount</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            $
            {disputeAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Unique Precedents</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-semibold text-teal-400 tabular-nums">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{uniquePrecedents}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
            memory_used: {String(analysis.memory_used)}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Memories Recalled</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-cyan-400 tabular-nums">
            {rawCount}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {uniquePrecedents} unique{' '}
            {uniquePrecedents === 1 ? 'precedent' : 'precedents'} from{' '}
            {rawCount} {rawCount === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Side-by-side Recommendation Comparison: Baseline vs Hindsight */}
      <div className="pt-1 pb-2 border-b border-slate-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-teal-400 shrink-0" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
              Recommendation Comparison
            </h3>
          </div>
          {hasBaselineComparison && recommendationShifted && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border text-amber-300 bg-amber-500/10 border-amber-500/30">
              Decision Shifted by Precedent
            </span>
          )}
          {hasBaselineComparison && !recommendationShifted && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border text-teal-300 bg-teal-500/10 border-teal-500/30">
              Decision Reinforced by Precedent
            </span>
          )}
        </div>

        {hasBaselineComparison && baselineRec ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 'Baseline Recommendation' (without Hindsight) */}
              <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      Baseline Recommendation
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      (without Hindsight)
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border text-slate-400 bg-slate-800/40 border-slate-700">
                    No Memory
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-mono text-2xl font-bold tracking-tight ${
                        isBaselineFight ? 'text-teal-400' : 'text-amber-400'
                      }`}
                    >
                      {baselineRec}
                    </span>
                    {analysis.baseline_confidence !== undefined && (
                      <span className="font-mono text-sm text-slate-400 tabular-nums">
                        {analysis.baseline_confidence}% confidence
                      </span>
                    )}
                  </div>
                  {analysis.baseline_confidence !== undefined && (
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isBaselineFight ? 'bg-teal-400' : 'bg-amber-400'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, analysis.baseline_confidence)
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-[#0C1322] border border-slate-800/80 rounded-lg p-3">
                  <span className="font-mono text-[11px] text-slate-400 block mb-1">
                    Baseline Reasoning:
                  </span>
                  {analysis.baseline_reasoning ||
                    'Evaluated strictly on current dispute claim & merchant evidence without historical outcomes.'}
                </div>
              </div>

              {/* 'Hindsight-Informed Recommendation' (with Hindsight) */}
              <div className="bg-[#080D19] border border-teal-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-teal-300">
                      Hindsight-Informed Recommendation
                    </div>
                    <div className="text-[11px] text-teal-400/80 font-mono">
                      (with Hindsight)
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border text-teal-300 bg-teal-500/10 border-teal-500/30">
                    Memory-Informed
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-mono text-2xl font-bold tracking-tight ${
                        isFight ? 'text-teal-400' : 'text-amber-400'
                      }`}
                    >
                      {analysis.decision}
                    </span>
                    <span className="font-mono text-sm text-slate-400 tabular-nums">
                      {analysis.confidence}% confidence
                    </span>
                  </div>
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isFight ? 'bg-teal-400' : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, analysis.confidence)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-[#0C1322] border border-slate-800/80 rounded-lg p-3">
                  <span className="font-mono text-[11px] text-slate-400 block mb-1">
                    Hindsight Reasoning:
                  </span>
                  {analysis.reasoning ||
                    'Influenced by historical precedent and retained dispute outcome memory.'}
                </div>
              </div>
            </div>

            {/* Visual Shift Summary */}
            <div className="bg-[#080D19] border border-slate-800/80 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">
                  Precedent Impact:
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {baselineRec} ({analysis.baseline_confidence ?? '—'}%)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span
                  className={`font-mono font-bold ${
                    isFight ? 'text-teal-400' : 'text-amber-400'
                  }`}
                >
                  {analysis.decision} ({analysis.confidence}%)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {recommendationShifted
                  ? 'Historical precedent shifted the recommended dispute decision.'
                  : 'Historical precedent reinforced the baseline dispute decision.'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#080D19] border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                Baseline comparison unavailable
              </div>
              <p className="text-xs text-slate-400">
                {!hasHindsightMemory
                  ? `No historical precedents or Hindsight memories were recalled for Case ${analysis.caseId}. Baseline comparison is available only when prior precedent informs the decision.`
                  : 'Baseline comparison unavailable — backend did not provide baseline evaluation without historical precedent.'}
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded border text-slate-400 bg-slate-800/50 border-slate-700 shrink-0">
              Baseline comparison unavailable
            </span>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Executive Summary &amp; Analysis Rationale
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed max-w-[75ch]">
          {analysis.reasoning || 'No reasoning text returned by backend.'}
        </p>
      </div>
    </div>
  );
};
