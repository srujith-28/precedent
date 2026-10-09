import React from 'react';
import { CaseAnalysisResult } from '../types/precedent';
import {
  EvidenceStatusBadge,
  StructuredEvidenceEntry,
} from '../utils/evidenceIntelligence';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  Compass,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface EvidenceListProps {
  analysis: CaseAnalysisResult;
}

const StatusBadgePill: React.FC<{ status: EvidenceStatusBadge }> = ({
  status,
}) => {
  if (status === 'AVAILABLE') {
    return (
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-teal-300 bg-teal-500/10 border-teal-500/30 shrink-0">
        AVAILABLE
      </span>
    );
  }
  if (status === 'MISSING') {
    return (
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-rose-300 bg-rose-500/10 border-rose-500/30 shrink-0">
        MISSING
      </span>
    );
  }
  if (status === 'WEAK') {
    return (
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-amber-300 bg-amber-500/10 border-amber-500/30 shrink-0">
        WEAK
      </span>
    );
  }
  if (status === 'RECOMMENDED') {
    return (
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-cyan-300 bg-cyan-500/10 border-cyan-500/30 shrink-0">
        RECOMMENDED
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded border text-slate-400 bg-slate-800/60 border-slate-700 shrink-0">
      Status unavailable
    </span>
  );
};

export const EvidenceList: React.FC<EvidenceListProps> = ({ analysis }) => {
  const intel = analysis.evidenceIntelligence;

  const availableEvidence: StructuredEvidenceEntry[] =
    intel?.availableEvidence || [];
  const missingEvidence: StructuredEvidenceEntry[] =
    intel?.missingEvidence || [];
  const weakEvidence: StructuredEvidenceEntry[] = intel?.weakEvidence || [];
  const recommendedEvidence: StructuredEvidenceEntry[] =
    intel?.recommendedEvidence || [];

  const coverage = intel?.coverage || {
    available: availableEvidence.length,
    missing: missingEvidence.length,
    weak: weakEvidence.length,
    recommended: recommendedEvidence.length,
  };

  const hindsightGap = intel?.hindsightEvidenceGap || null;
  const combinedGaps = [...missingEvidence, ...weakEvidence];

  const hasEnoughInfoForGaps = Boolean(
    (analysis.reasoning && analysis.reasoning.trim().length > 0) ||
      (analysis.merchantEvidence &&
        analysis.merchantEvidence.trim().length > 0) ||
      analysis.hasExplicitEvidenceCategories
  );

  const evidenceStrategyText =
    analysis.evidence_strategy || intel?.evidenceStrategyText;

  // Impact summary items combining available & missing evidence with their impact
  const allImpactEntries = [
    ...availableEvidence,
    ...missingEvidence,
    ...weakEvidence,
  ].slice(0, 6);

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400 shrink-0" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              EVIDENCE INTELLIGENCE
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Structured evidence analysis distinguishing supplied merchant documentation from evidence gaps and recommended submissions.
          </p>
        </div>

        <span className="font-mono text-[11px] text-slate-400 bg-[#080D19] border border-slate-800 px-3 py-1 rounded-lg">
          Evidence Coverage Summary
        </span>
      </div>

      {/* Coverage Status Strip */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Evidence Coverage
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#080D19] border border-teal-500/30 rounded-xl p-3.5">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-teal-400">
              AVAILABLE
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-100 tabular-nums">
              {coverage.available}{' '}
              <span className="text-xs font-normal text-slate-400">
                {coverage.available === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Available: {coverage.available}
            </div>
          </div>

          <div className="bg-[#080D19] border border-rose-500/30 rounded-xl p-3.5">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-rose-400">
              MISSING
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-100 tabular-nums">
              {coverage.missing}{' '}
              <span className="text-xs font-normal text-slate-400">
                {coverage.missing === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Missing: {coverage.missing}
            </div>
          </div>

          <div className="bg-[#080D19] border border-amber-500/30 rounded-xl p-3.5">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-400">
              WEAK
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-100 tabular-nums">
              {coverage.weak}{' '}
              <span className="text-xs font-normal text-slate-400">
                {coverage.weak === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Weak: {coverage.weak}
            </div>
          </div>

          <div className="bg-[#080D19] border border-cyan-500/30 rounded-xl p-3.5">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              RECOMMENDED
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-100 tabular-nums">
              {coverage.recommended}{' '}
              <span className="text-xs font-normal text-slate-400">
                {coverage.recommended === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Recommended: {coverage.recommended}
            </div>
          </div>
        </div>
      </div>

      {/* 1. AVAILABLE EVIDENCE & 2. MISSING / WEAK EVIDENCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
        {/* 1. AVAILABLE EVIDENCE */}
        <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
                1. AVAILABLE EVIDENCE
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Evidence actually supplied by the merchant in this dispute
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-teal-400 tabular-nums">
              {availableEvidence.length}{' '}
              {availableEvidence.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {availableEvidence.length === 0 ? (
            <div className="py-4 text-xs text-slate-400">
              No merchant evidence provided.
            </div>
          ) : (
            <ul className="space-y-3">
              {availableEvidence.map((item) => (
                <li
                  key={item.id}
                  className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 text-xs font-semibold text-slate-100">
                      <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>{item.label}</span>
                    </div>
                    <StatusBadgePill status={item.status} />
                  </div>
                  <div className="pl-6 text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-mono text-slate-400">
                      Why this evidence matters:{' '}
                    </span>
                    → {item.whyItMatters}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 2. MISSING / WEAK EVIDENCE */}
        <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-rose-400">
                2. MISSING / WEAK EVIDENCE
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Missing or insufficient documentation identified from the dispute &amp; analysis
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-rose-400 tabular-nums">
              {combinedGaps.length}{' '}
              {combinedGaps.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {!hasEnoughInfoForGaps ? (
            <div className="py-4 flex items-center justify-between text-xs text-slate-400">
              <span>Insufficient backend context to classify evidence gaps.</span>
              <StatusBadgePill status="Status unavailable" />
            </div>
          ) : combinedGaps.length === 0 ? (
            <div className="py-4 text-xs text-slate-400 leading-relaxed">
              No missing or weak evidence gaps identified in the current submission.
            </div>
          ) : (
            <ul className="space-y-3">
              {combinedGaps.map((item) => (
                <li
                  key={item.id}
                  className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 text-xs font-semibold text-slate-100">
                      {item.status === 'WEAK' ? (
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>! {item.label}</span>
                    </div>
                    <StatusBadgePill status={item.status} />
                  </div>
                  <div className="pl-6 text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-mono text-slate-400">
                      Why this evidence matters:{' '}
                    </span>
                    → {item.whyItMatters}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3. RECOMMENDED EVIDENCE */}
      <div className="bg-[#080D19] border border-cyan-500/30 rounded-xl p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
              3. RECOMMENDED EVIDENCE
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Evidence that could strengthen the case (not currently supplied in merchant evidence)
            </div>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            evidence_to_submit ({recommendedEvidence.length})
          </span>
        </div>

        {recommendedEvidence.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            No recommended evidence items returned in evidence_to_submit for this case.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5">
            {recommendedEvidence.map((item) => (
              <li
                key={item.id}
                className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3.5 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 text-xs font-semibold text-slate-100">
                    <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item.label}</span>
                  </div>
                  <StatusBadgePill status={item.status} />
                </div>
                <div className="pl-6 text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-mono text-cyan-400/90">
                    Why this evidence matters:{' '}
                  </span>
                  → {item.whyItMatters}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 4. EVIDENCE IMPACT */}
      <div className="bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
                4. EVIDENCE IMPACT
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Why this evidence matters &amp; how supplied documentation shifts dispute evaluation
              </div>
            </div>
          </div>
          {evidenceStrategyText && (
            <span className="font-mono text-[11px] text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 rounded">
              Strategy Active
            </span>
          )}
        </div>

        {evidenceStrategyText && (
          <div className="bg-[#0C1322] border border-teal-500/20 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-teal-400">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Evidence Strategy</span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              {evidenceStrategyText}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allImpactEntries.length === 0 ? (
            <p className="text-xs text-slate-400 col-span-2 py-2">
              No specific evidence impact details available.
            </p>
          ) : (
            allImpactEntries.map((item) => (
              <div
                key={`impact-${item.id}`}
                className="bg-[#0C1322] border border-slate-800/70 rounded-lg p-3 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100 truncate">
                    {item.label}
                  </span>
                  <StatusBadgePill status={item.status} />
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-slate-400 font-mono">Impact: </span>
                  {item.whyItMatters}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. CONNECT EVIDENCE TO MEMORY (HINDSIGHT-IDENTIFIED EVIDENCE GAP) */}
      {hindsightGap && (
        <div className="bg-[#080D19] border border-teal-500/30 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
                HINDSIGHT-IDENTIFIED EVIDENCE GAP
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Connected to Recalled Hindsight Precedent
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3">
              <span className="text-slate-400 block text-[11px] font-mono uppercase">
                Previous Case
              </span>
              <span className="mt-1 block font-mono font-bold text-slate-100">
                {hindsightGap.previousCaseId}
              </span>
            </div>

            <div className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3">
              <span className="text-slate-400 block text-[11px] font-mono uppercase">
                Historical Outcome
              </span>
              <span
                className={`mt-1 inline-block font-mono text-xs font-bold uppercase px-2 py-0.5 rounded border ${
                  hindsightGap.historicalOutcome.toUpperCase().includes('LOST')
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    : 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                }`}
              >
                {hindsightGap.historicalOutcome}
              </span>
            </div>

            <div className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3 sm:col-span-2 lg:col-span-1">
              <span className="text-slate-400 block text-[11px] font-mono uppercase">
                Current Case
              </span>
              <span className="mt-1 block font-mono font-bold text-teal-300">
                {hindsightGap.currentCaseId}
              </span>
            </div>

            <div className="bg-[#0C1322] border border-slate-800/80 rounded-lg p-3 sm:col-span-1">
              <span className="text-slate-400 block text-[11px] font-mono uppercase">
                Lesson
              </span>
              <p className="mt-1 text-slate-200 leading-relaxed">
                {hindsightGap.lesson}
              </p>
            </div>

            <div className="bg-[#0C1322] border border-rose-500/30 rounded-lg p-3 sm:col-span-1">
              <span className="text-rose-300 block text-[11px] font-mono uppercase font-semibold">
                Potential evidence gap
              </span>
              <p className="mt-1 text-slate-100 font-medium leading-relaxed">
                {hindsightGap.potentialEvidenceGap}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
