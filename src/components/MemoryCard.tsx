import React from 'react';
import { MemoryEntry } from '../types/precedent';
import { ArrowUpRight } from 'lucide-react';

interface MemoryCardProps {
  memory: MemoryEntry;
  compact?: boolean;
  onApplyToAnalyzer?: (memory: MemoryEntry) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  compact = false,
  onApplyToAnalyzer,
}) => {
  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-400">
            <span className="font-mono font-medium text-teal-400 tabular-nums">
              {memory.memoryCode}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-300">
              {memory.disputeType}
            </span>
            {memory.outcomeLearnedFrom && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-mono font-semibold ${
                    memory.outcomeLearnedFrom === 'WON'
                      ? 'text-teal-400'
                      : 'text-rose-400'
                  }`}
                >
                  Outcome: {memory.outcomeLearnedFrom}
                </span>
              </>
            )}
          </div>

          <div>
            {memory.isDemo ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Demo
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 rounded">
                Live Hindsight
              </span>
            )}
          </div>
        </div>

        <h4 className="text-base font-semibold text-slate-100 leading-snug">
          {memory.patternTitle}
        </h4>

        <div className="space-y-1.5 pt-1">
          {memory.actualResult && (
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="font-medium text-slate-300">Actual Result: </span>
              {memory.actualResult}
            </p>
          )}
          <p className="text-xs text-slate-200 leading-relaxed bg-[#080D19] border border-slate-800/80 rounded-lg p-3">
            <span className="font-semibold text-cyan-400">Lesson: </span>
            &ldquo;{memory.lesson}&rdquo;
          </p>
        </div>

        {!compact &&
          memory.recommendedAction &&
          memory.recommendedAction !== memory.lesson && (
            <div className="pt-2 text-xs">
              <span className="text-slate-400 font-medium">
                Future Improvement:{' '}
              </span>
              <span className="text-slate-300">{memory.recommendedAction}</span>
            </div>
          )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 text-xs font-mono tabular-nums">
          <div>
            <span className="text-slate-400 font-sans mr-1.5">Recalled:</span>
            <span className="text-cyan-400 font-semibold">
              {memory.recalledCount}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-sans mr-1.5">
              Cases Improved:
            </span>
            <span className="text-teal-400 font-semibold">
              {memory.casesImprovedCount}
            </span>
          </div>
        </div>

        {onApplyToAnalyzer && (
          <button
            type="button"
            onClick={() => onApplyToAnalyzer(memory)}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Load CB-002 in Analyzer</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
