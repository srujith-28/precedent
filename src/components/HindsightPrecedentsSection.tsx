import React, { useState } from 'react';
import { CaseAnalysisResult } from '../types/precedent';
import { ConsolidatedPrecedent } from '../utils/precedentConsolidator';
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface HindsightPrecedentsSectionProps {
  analysis: CaseAnalysisResult;
  onRecordOutcome?: (caseId: string) => void;
}

const PrecedentCardItem: React.FC<{
  precedent: ConsolidatedPrecedent;
  isExcludedCurrentCase?: boolean;
}> = ({ precedent, isExcludedCurrentCase = false }) => {
  return (
    <div
      className={`bg-[#080D19] rounded-xl p-5 space-y-3.5 border ${
        isExcludedCurrentCase
          ? 'border-amber-500/30'
          : 'border-slate-800/90 hover:border-teal-500/30 transition-colors'
      }`}
    >
      {/* Top Row: CB-001 · Subscription | LOST */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="font-bold text-slate-100">{precedent.caseId}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-200 font-medium">
            {precedent.disputeType}
          </span>
        </div>

        {precedent.outcome && (
          <span
            className={`font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
              precedent.outcome === 'LOST'
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                : 'text-teal-400 bg-teal-500/10 border-teal-500/30'
            }`}
          >
            {precedent.outcome}
          </span>
        )}
      </div>

      {/* Second Row: RECALLED FROM HINDSIGHT + Historical Precedent vs Current Case distinction */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
            <BrainCircuit className="w-3 h-3 shrink-0" />
            <span>RECALLED FROM HINDSIGHT</span>
          </span>

          {isExcludedCurrentCase ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              <ShieldAlert className="w-3 h-3 shrink-0" />
              <span>CURRENT CASE ID (NOT TREATED AS PRIOR PRECEDENT)</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              HISTORICAL PRECEDENT
            </span>
          )}
        </div>

        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
          Consolidated from {precedent.rawMemoryCount} memory{' '}
          {precedent.rawMemoryCount === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Third Row: PRECEDENT LESSON */}
      <div className="bg-[#0C1322] border border-slate-800/90 rounded-lg p-4 space-y-1.5">
        <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
          PRECEDENT LESSON
        </div>
        <p className="text-sm text-slate-100 leading-relaxed">
          {precedent.consolidatedLesson}
        </p>
      </div>
    </div>
  );
};

export const HindsightPrecedentsSection: React.FC<
  HindsightPrecedentsSectionProps
> = ({ analysis, onRecordOutcome }) => {
  const [showRawMemories, setShowRawMemories] = useState(false);

  const rawCount = analysis.recalled_memories.length;
  const displayedPrecedents = analysis.displayedPrecedents || [];
  const excludedCurrent = analysis.excludedCurrentCasePrecedents || [];
  const uniquePrecedentsCount = analysis.uniquePrecedentsCount ?? 0;
  const historicalPrecedentsCount = analysis.historicalPrecedentsCount ?? 0;

  // Dynamic derived summary line: "X unique precedents recalled from Y Hindsight memory entries"
  const activeUniqueDisplayedCount =
    displayedPrecedents.length > 0
      ? displayedPrecedents.length
      : uniquePrecedentsCount;

  const summaryText =
    rawCount === 0
      ? '0 unique precedents recalled from 0 Hindsight memory entries'
      : `${activeUniqueDisplayedCount} unique ${
          activeUniqueDisplayedCount === 1 ? 'precedent' : 'precedents'
        } recalled from ${rawCount} Hindsight memory ${
          rawCount === 1 ? 'entry' : 'entries'
        }`;

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-slate-100">
              Hindsight Precedents
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              Consolidated by Case ID
            </span>
          </div>
          <p className="text-xs font-mono text-teal-400 font-medium">
            {summaryText}
          </p>
        </div>

        {/* Dynamic Metrics Pill Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          <div className="bg-[#080D19] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 mr-1.5">Unique Precedents:</span>
            <span className="text-teal-400 font-bold">
              {uniquePrecedentsCount}
            </span>
          </div>
          <div className="bg-[#080D19] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 mr-1.5">Memories Recalled:</span>
            <span className="text-cyan-400 font-bold">{rawCount}</span>
          </div>
        </div>
      </div>

      {/* Empty State when 0 memories returned */}
      {rawCount === 0 && (
        <div className="bg-[#080D19] border border-slate-800/80 rounded-xl p-5 text-xs text-slate-400 leading-relaxed">
          No Hindsight memories were recalled for Case{' '}
          <span className="font-mono text-slate-200">{analysis.caseId}</span>.
          {onRecordOutcome && (
            <>
              {' '}
              Once resolved,{' '}
              <button
                type="button"
                onClick={() => onRecordOutcome(analysis.caseId)}
                className="text-teal-400 hover:underline font-medium"
              >
                record the actual outcome via POST /outcome
              </button>{' '}
              so future disputes can recall this case as a historical precedent.
            </>
          )}
        </div>
      )}

      {/* Historical Precedents from Prior Cases (Top 3–5 Unique Precedents) */}
      {displayedPrecedents.length > 0 && (
        <div className="space-y-3.5">
          {displayedPrecedents.map((precedent) => (
            <PrecedentCardItem key={precedent.id} precedent={precedent} />
          ))}

          {historicalPrecedentsCount > displayedPrecedents.length && (
            <p className="text-xs text-slate-400 font-mono">
              Showing top {displayedPrecedents.length} most relevant precedents
              out of {historicalPrecedentsCount} unique historical cases.
            </p>
          )}
        </div>
      )}

      {/* Current Case Exclusion Distinction Notice & Consolidated View */}
      {excludedCurrent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-semibold text-amber-300">
                Current Case Distinguished from Historical Precedent (
                {analysis.caseId})
              </div>
              <p className="text-slate-300">
                {displayedPrecedents.length > 0
                  ? `Recalled Hindsight entries matching the current Case ID (${analysis.caseId}) were excluded from the Historical Precedents list above so the active case is not treated as its own prior precedent.`
                  : `All ${rawCount} recalled Hindsight memory entries belong to Case ID ${analysis.caseId}, which matches the current case being analyzed. Below is the single consolidated record for ${analysis.caseId}. Analyze a subsequent case (e.g. CB-002) to recall ${analysis.caseId} as a prior Historical Precedent.`}
              </p>
            </div>
          </div>

          {/* When no other prior cases exist (e.g., testing CB-001 directly), show the consolidated card clearly marked as Current Case */}
          {displayedPrecedents.length === 0 &&
            excludedCurrent.map((precedent) => (
              <PrecedentCardItem
                key={precedent.id}
                precedent={precedent}
                isExcludedCurrentCase
              />
            ))}
        </div>
      )}

      {/* Expandable Raw Recalled Memories Access ("View raw recalled memories (18)") */}
      {rawCount > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowRawMemories((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-teal-300 transition-colors py-1 cursor-pointer"
          >
            {showRawMemories ? (
              <ChevronDown className="w-4 h-4 text-teal-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <span>View raw recalled memories ({rawCount})</span>
          </button>

          {showRawMemories && (
            <div className="mt-3 bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-2 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-slate-800/80">
                <span>Original Unmodified Hindsight Memory Entries</span>
                <span>{rawCount} raw entries</span>
              </div>
              <ol className="space-y-2 text-xs text-slate-300 font-mono">
                {analysis.recalled_memories.map((rawMem, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 py-1 border-b border-slate-800/40 last:border-0"
                  >
                    <span className="text-slate-500 shrink-0 select-none tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="font-sans text-slate-200 leading-relaxed">
                      {rawMem}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
