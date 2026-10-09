import React from 'react';
import { CaseAnalysisResult } from '../types/precedent';
import {
  ArrowRight,
  BrainCircuit,
  FileSpreadsheet,
  GitCompare,
  Sparkles,
} from 'lucide-react';

interface MemoryImpactCardProps {
  analysis: CaseAnalysisResult;
}

export const MemoryImpactCard: React.FC<MemoryImpactCardProps> = ({
  analysis,
}) => {
  const hasBaselineFields = Boolean(
    analysis.baseline_recommendation &&
      analysis.baseline_recommendation.trim().length > 0
  );

  if (!hasBaselineFields) {
    return (
      <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <GitCompare className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
            MEMORY IMPACT
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Baseline comparison unavailable
        </span>
      </div>
    );
  }

  const baselineRec = analysis.baseline_recommendation!;
  const currentRec = analysis.recommendation || analysis.decision;
  const recommendationShifted =
    baselineRec.trim().toUpperCase() !== currentRec.trim().toUpperCase();

  const primaryPrecedent =
    analysis.displayedPrecedents?.[0] ??
    analysis.excludedCurrentCasePrecedents?.[0];

  const relevantPrecedent =
    analysis.relevant_precedent ||
    (primaryPrecedent
      ? `${primaryPrecedent.caseId} · ${primaryPrecedent.disputeType}`
      : analysis.recalled_memories[0] || '—');

  const keyLesson =
    analysis.key_lesson ||
    primaryPrecedent?.consolidatedLesson ||
    analysis.recalled_memories[0] ||
    '—';

  const previousOutcome =
    analysis.previous_outcome || primaryPrecedent?.outcome || '—';

  const uniquePrecedentsCount = analysis.uniquePrecedentsCount ?? 0;
  const rawMemoriesCount = analysis.recalled_memories.length;

  const evidenceStrategy =
    analysis.evidenceIntelligence?.evidenceStrategyComparison;

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
      {/* Top Header & Visual Recommendation Transition */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <GitCompare className="w-4 h-4 text-teal-400 shrink-0" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              MEMORY IMPACT
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              Dual-Path Evaluation
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-400">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              {analysis.memory_used
                ? recommendationShifted
                  ? `Hindsight influenced this recommendation — shifted decision from ${baselineRec} to ${currentRec}.`
                  : `Hindsight influenced this recommendation — reinforced ${currentRec} decision with recalled precedent.`
                : 'No historical precedents recalled — baseline and final decision are identical.'}
            </span>
          </div>
        </div>

        {/* Visual Transition Pill: FIGHT → FOLD */}
        <div className="flex items-center gap-3 bg-[#080D19] border border-teal-500/30 px-4 py-2.5 rounded-lg font-mono text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Baseline:
            </span>
            <span
              className={`font-bold ${
                baselineRec.toUpperCase().includes('FIGHT')
                  ? 'text-teal-400'
                  : 'text-amber-400'
              }`}
            >
              {baselineRec}
            </span>
            {analysis.baseline_confidence !== undefined && (
              <span className="text-xs text-slate-400 tabular-nums">
                ({analysis.baseline_confidence}%)
              </span>
            )}
          </div>

          <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />

          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-teal-300">
              Hindsight:
            </span>
            <span
              className={`font-bold ${
                currentRec.toUpperCase().includes('FIGHT')
                  ? 'text-teal-400'
                  : 'text-amber-400'
              }`}
            >
              {currentRec}
            </span>
            <span className="text-xs text-slate-300 tabular-nums">
              ({analysis.confidence}%)
            </span>
          </div>
        </div>
      </div>

      {/* Two Clearly Separated Decision Paths: 1. WITHOUT HINDSIGHT vs 2. WITH HINDSIGHT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Path 1: WITHOUT HINDSIGHT */}
        <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  1. WITHOUT HINDSIGHT
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Current-Case Evidence Only · 0 Precedents
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                Baseline Path
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Recommendation</span>
                <span
                  className={`mt-0.5 block font-mono text-xl font-bold ${
                    baselineRec.toUpperCase().includes('FIGHT')
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {baselineRec}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Confidence</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-xl font-semibold text-slate-100 tabular-nums">
                    {analysis.baseline_confidence !== undefined
                      ? `${analysis.baseline_confidence}%`
                      : '—'}
                  </span>
                  {analysis.baseline_confidence !== undefined && (
                    <div className="flex-1 max-w-[60px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          baselineRec.toUpperCase().includes('FIGHT')
                            ? 'bg-teal-400/70'
                            : 'bg-amber-400/70'
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
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 text-xs space-y-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 block">
                Baseline Reasoning
              </span>
              <p className="text-slate-300 leading-relaxed">
                {analysis.baseline_reasoning || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Path 2: WITH HINDSIGHT */}
        <div className="bg-[#080D19] border border-teal-500/40 rounded-xl p-4 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
                  2. WITH HINDSIGHT
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Current-Case Evidence + {uniquePrecedentsCount} Unique{' '}
                  {uniquePrecedentsCount === 1 ? 'Precedent' : 'Precedents'}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                <BrainCircuit className="w-3 h-3 shrink-0" />
                <span>Memory-Aware</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Recommendation</span>
                <span
                  className={`mt-0.5 block font-mono text-xl font-bold ${
                    currentRec.toUpperCase().includes('FIGHT')
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {currentRec}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Confidence</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-xl font-semibold text-slate-100 tabular-nums">
                    {analysis.confidence}%
                  </span>
                  <div className="flex-1 max-w-[60px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        currentRec.toUpperCase().includes('FIGHT')
                          ? 'bg-teal-400'
                          : 'bg-amber-400'
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
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 text-xs space-y-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-teal-400 block">
                Hindsight-Informed Reasoning
              </span>
              <p className="text-slate-100 leading-relaxed">
                {analysis.reasoning || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. CONNECT EVIDENCE TO MEMORY IMPACT (Evidence Strategy Changed) */}
      <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
              {evidenceStrategy?.strategyChanged
                ? 'Evidence Strategy Changed'
                : 'Evidence Strategy'}
            </span>
          </div>
          {evidenceStrategy?.strategyChanged && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              Guided by Recalled Precedent
            </span>
          )}
        </div>

        {evidenceStrategy?.strategyChanged ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3 space-y-1.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                WITHOUT HINDSIGHT
              </span>
              <ul className="space-y-1 text-slate-300">
                {evidenceStrategy.withoutHindsightEvidence.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0C1322] border border-teal-500/30 rounded-lg p-3 space-y-1.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
                WITH HINDSIGHT
              </span>
              <ul className="space-y-1 text-slate-100">
                {evidenceStrategy.withHindsightEvidence.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Evidence strategy unchanged.</p>
        )}
      </div>

      {/* PREVIOUS PRECEDENT & LESSON APPLIED */}
      {analysis.memory_used && (
        <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
              PREVIOUS PRECEDENT
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {uniquePrecedentsCount} unique{' '}
              {uniquePrecedentsCount === 1 ? 'precedent' : 'precedents'} from{' '}
              {rawMemoriesCount} recalled memory{' '}
              {rawMemoriesCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
            <div className="sm:col-span-3">
              <span className="text-slate-400 block">Previous Outcome</span>
              <span
                className={`mt-1 inline-block font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                  previousOutcome.toUpperCase().includes('LOST')
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    : previousOutcome.toUpperCase().includes('WON')
                    ? 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                    : 'text-slate-200 border-slate-700'
                }`}
              >
                {previousOutcome}
              </span>
            </div>

            <div className="sm:col-span-3">
              <span className="text-slate-400 block">
                Relevant Recalled Precedent
              </span>
              <p className="mt-1 font-mono font-semibold text-slate-100">
                {relevantPrecedent}
              </p>
            </div>

            <div className="sm:col-span-6">
              <span className="text-slate-400 block">
                Consolidated Precedent Lesson
              </span>
              <p className="mt-1 text-slate-200 leading-relaxed">{keyLesson}</p>
            </div>
          </div>

          {analysis.memory_used_summary && (
            <div className="pt-2.5 border-t border-slate-800/80 text-xs">
              <span className="font-mono text-[11px] uppercase tracking-wider text-teal-400 block mb-1">
                How Hindsight Precedent Influenced the Decision
              </span>
              <p className="text-slate-300 leading-relaxed">
                {analysis.memory_used_summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
