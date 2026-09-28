import React from 'react';
import { CaseAnalysisResult } from '../types/precedent';
import { ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';

interface DecisionCardProps {
  analysis: CaseAnalysisResult;
  disputeAmount: number;
  onOpenOutcomeForm?: (caseId: string) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  analysis,
  disputeAmount,
  onOpenOutcomeForm,
}) => {
  const isFight = analysis.decision === 'FIGHT';

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
      {/* Top Executive Verdict Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span>Case {analysis.caseId}</span>
            <span aria-hidden="true">·</span>
            <span>{analysis.analyzedAt}</span>
            {analysis.isDemo ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Demo
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 rounded">
                Live FastAPI Response
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 pt-1">
            {isFight ? (
              <ShieldCheck className="w-7 h-7 text-teal-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-[11px] font-mono text-slate-400">
                recommendation
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className={`font-mono text-3xl font-bold tracking-tight ${
                    isFight ? 'text-teal-400' : 'text-amber-400'
                  }`}
                >
                  {analysis.decision}
                </span>
                <span className="text-sm font-medium text-slate-300">
                  {analysis.recommendation}
                </span>
              </div>
            </div>
          </div>
        </div>

        {onOpenOutcomeForm && (
          <button
            type="button"
            onClick={() => onOpenOutcomeForm(analysis.caseId)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#070B14] border border-slate-700 hover:border-teal-400 text-slate-200 hover:text-teal-300 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Record Outcome (POST /outcome)</span>
          </button>
        )}
      </div>

      {/* Response Fields Strip: confidence, amount, memory_used */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="text-xs font-mono text-slate-400">confidence</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            {analysis.confidence}%
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-slate-400">amount</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            ${disputeAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-slate-400">memory_used</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold text-cyan-400">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{analysis.memory_used ? 'true' : 'false'}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {analysis.recalled_memories.length} recalled memory item(s)
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono font-semibold text-slate-400">
          reasoning
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed max-w-[75ch]">
          {analysis.reasoning}
        </p>
      </div>

      {/* Recalled Memories Raw Output */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        <h4 className="text-xs font-mono font-semibold text-cyan-400">
          recalled_memories ({analysis.recalled_memories.length})
        </h4>
        {analysis.recalled_memories.length === 0 ? (
          <p className="text-xs text-slate-400">
            No prior Hindsight memories recalled for this case.
          </p>
        ) : (
          <ul className="space-y-2">
            {analysis.recalled_memories.map((mem, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-200 bg-[#080D19] border border-cyan-500/30 rounded-lg p-3 leading-relaxed"
              >
                {mem}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
