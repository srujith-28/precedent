import React from 'react';
import { ChargebackCase } from '../types/precedent';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileSearch,
  GitMerge,
} from 'lucide-react';

interface CaseHistoryTableProps {
  cases: ChargebackCase[];
  onSelectCase: (caseItem: ChargebackCase) => void;
  selectedCaseId?: string;
  onRecordOutcome?: (caseItem: ChargebackCase) => void;
  onNavigateAnalyze?: () => void;
  onLoadIntoIntake?: (caseItem: ChargebackCase) => void;
  onViewLearningChain?: (caseItem: ChargebackCase) => void;
}

export const CaseHistoryTable: React.FC<CaseHistoryTableProps> = ({
  cases,
  onSelectCase,
  selectedCaseId,
  onRecordOutcome,
  onNavigateAnalyze,
  onLoadIntoIntake,
  onViewLearningChain,
}) => {
  if (cases.length === 0) {
    return (
      <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-10 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto">
          <FileSearch className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-200">
            No matching dispute cases in Case History
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Real cases appear here immediately after running live analysis via{' '}
            <code className="font-mono text-teal-400">POST /analyze</code>. No hardcoded case history is pre-populated.
          </p>
        </div>
        {onNavigateAnalyze && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateAnalyze}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
            >
              <span>Analyze Dispute Case</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/90 bg-[#090E1A] text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4 whitespace-nowrap">Case ID</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Dispute Type</th>
              <th className="py-3.5 px-4 text-right whitespace-nowrap">Amount</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Recommendation</th>
              <th className="py-3.5 px-4 whitespace-nowrap">
                Outcome (If Recorded)
              </th>
              <th className="py-3.5 px-4 whitespace-nowrap">memory_used</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Timestamp</th>
              <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {cases.map((item) => {
              const isSelected = selectedCaseId === item.id;
              const isFight = item.decision === 'FIGHT';
              const uniqueCount = item.analysis.uniquePrecedentsCount ?? 0;
              const rawCount = item.analysis.recalled_memories.length;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectCase(item)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-500/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-100 whitespace-nowrap tabular-nums">
                    <div className="flex items-center gap-2">
                      <span>{item.caseId}</span>
                      {item.isSyntheticDemo ? (
                        <span className="inline-flex items-center text-[10px] font-mono tracking-wider text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded font-normal">
                          Demo Precedent
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-mono tracking-wider text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded font-normal">
                          Live Case
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-200 whitespace-nowrap">
                    {item.disputeType}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-100 whitespace-nowrap tabular-nums">
                    $
                    {item.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-mono">
                      {item.analysis.baseline_recommendation && (
                        <>
                          <span className="text-slate-400 text-[11px]">
                            {item.analysis.baseline_recommendation}
                          </span>
                          <span className="text-cyan-400 text-[11px]">→</span>
                        </>
                      )}
                      <span
                        className={`font-bold ${
                          isFight ? 'text-teal-400' : 'text-amber-400'
                        }`}
                      >
                        {item.decision}
                      </span>
                      <span className="text-slate-400 text-[11px] tabular-nums">
                        ({item.confidence}%)
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                    {item.outcomeRecorded &&
                    (item.outcome === 'WON' || item.outcome === 'LOST') ? (
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          item.outcome === 'WON'
                            ? 'text-teal-400'
                            : 'text-rose-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.outcome} (Retained)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span>Not Recorded</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                    {item.analysis.memory_used ? (
                      <span className="text-cyan-400 font-semibold">
                        true ({uniqueCount}{' '}
                        {uniqueCount === 1 ? 'precedent' : 'precedents'} /{' '}
                        {rawCount} raw)
                      </span>
                    ) : (
                      <span className="text-slate-500">false</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                    {item.submittedAt}
                  </td>
                  <td
                    className="py-3.5 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-2">
                      {onViewLearningChain && (
                        <button
                          type="button"
                          onClick={() => onViewLearningChain(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded transition-colors whitespace-nowrap"
                          title={`View Precedent Learning Chain for ${item.caseId}`}
                        >
                          <GitMerge className="w-3 h-3 text-violet-400" />
                          <span>View Learning Chain</span>
                        </button>
                      )}
                      {onLoadIntoIntake && (
                        <button
                          type="button"
                          onClick={() => onLoadIntoIntake(item)}
                          className="px-2 py-1 text-[11px] font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded transition-colors whitespace-nowrap"
                          title="Load dispute parameters into the Intake form to run live analysis"
                        >
                          Load into Intake
                        </button>
                      )}
                      {onRecordOutcome && (
                        <button
                          type="button"
                          onClick={() => onRecordOutcome(item)}
                          className="px-2.5 py-1 text-[11px] font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded transition-colors"
                        >
                          {item.outcomeRecorded
                            ? 'Update Outcome'
                            : 'Record Outcome'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectCase(item)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-teal-300 transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
