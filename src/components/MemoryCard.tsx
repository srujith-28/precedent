import React, { useState } from 'react';
import { MemoryEntry } from '../types/precedent';
import {
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface MemoryCardProps {
  memory: MemoryEntry;
  compact?: boolean;
  onUseInAnalyzer?: (memory: MemoryEntry) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  compact = false,
  onUseInAnalyzer,
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const isRetained = memory.sourceType === 'RETAINED IN HINDSIGHT';
  const rawList = memory.rawMemories || [];
  const rawCount = memory.rawMemoryCount ?? (rawList.length || 1);

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-3.5">
        {/* Top Row: CB-001 · Subscription | LOST */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="font-bold text-slate-100">
              {memory.caseIdOrigin || memory.memoryCode}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-200 font-medium">
              {memory.disputeType}
            </span>
          </div>

          {memory.outcomeLearnedFrom && (
            <span
              className={`font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                memory.outcomeLearnedFrom === 'LOST'
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  : 'text-teal-400 bg-teal-500/10 border-teal-500/30'
              }`}
            >
              {memory.outcomeLearnedFrom}
            </span>
          )}
        </div>

        {/* Badge Row: RECALLED FROM HINDSIGHT / RETAINED IN HINDSIGHT */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
              isRetained
                ? 'text-teal-300 border-teal-500/30 bg-teal-500/10'
                : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
            }`}
          >
            {isRetained ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" />
            ) : (
              <BrainCircuit className="w-3 h-3 shrink-0" />
            )}
            <span>{memory.sourceType}</span>
          </span>

          {rawCount > 1 && (
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              Consolidated from {rawCount} memory entries
            </span>
          )}
        </div>

        {/* PRECEDENT LESSON */}
        <div className="bg-[#080D19] border border-slate-800/90 rounded-lg p-4 space-y-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold text-cyan-400 block">
            PRECEDENT LESSON
          </span>
          <p className="text-sm text-slate-100 leading-relaxed">
            {memory.lesson}
          </p>
        </div>

        {memory.actualResult && (
          <div className="text-xs text-slate-400 leading-relaxed">
            <span className="font-medium text-slate-300">Actual Result: </span>
            <span>{memory.actualResult}</span>
          </div>
        )}

        {rawList.length > 1 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowRaw((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              {showRaw ? (
                <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>View raw recalled memories ({rawList.length})</span>
            </button>

            {showRaw && (
              <ol className="mt-2 bg-[#080D19] border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs text-slate-300 max-h-56 overflow-y-auto">
                {rawList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-slate-500 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span>{memory.relevanceContext}</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {memory.timestamp}
            </span>
          </div>

          {onUseInAnalyzer && (
            <button
              type="button"
              onClick={() => onUseInAnalyzer(memory)}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Start Next Case in Analyzer</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
