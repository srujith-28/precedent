import React from 'react';
import { ChargebackCase } from '../types/precedent';
import { ArrowUpRight } from 'lucide-react';

interface CaseHistoryTableProps {
  cases: ChargebackCase[];
  onSelectCase: (caseItem: ChargebackCase) => void;
  selectedCaseId?: string;
  onOpenOutcomeModal?: (caseItem: ChargebackCase) => void;
}

export const CaseHistoryTable: React.FC<CaseHistoryTableProps> = ({
  cases,
  onSelectCase,
  selectedCaseId,
  onOpenOutcomeModal,
}) => {
  if (cases.length === 0) {
    return (
      <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-10 text-center">
        <p className="text-sm font-medium text-slate-300">
          No dispute cases match your current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/90 bg-[#090E1A] text-[11px] font-medium text-slate-400">
              <th className="py-3 px-4 whitespace-nowrap">Case ID</th>
              <th className="py-3 px-4 whitespace-nowrap">Dispute Type</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Amount</th>
              <th className="py-3 px-4 whitespace-nowrap">Decision</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Confidence</th>
              <th className="py-3 px-4 whitespace-nowrap">Memory Used</th>
              <th className="py-3 px-4 whitespace-nowrap">Outcome</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {cases.map((item) => {
              const isSelected = selectedCaseId === item.caseId;
              const isFight = item.decision === 'FIGHT';

              const outcomeColor =
                item.outcome === 'WON'
                  ? 'text-teal-400'
                  : item.outcome === 'LOST'
                  ? 'text-rose-400'
                  : item.outcome === 'FOLDED'
                  ? 'text-slate-400'
                  : 'text-amber-400';

              const primaryMemory = item.analysis.memory_used
                ? item.analysis.hindsightMemoryUsed[0]?.memoryCode || 'Recalled (true)'
                : 'false';

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectCase(item)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-500/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-100 whitespace-nowrap tabular-nums">
                    <div className="flex items-center gap-2">
                      <span>{item.caseId}</span>
                      {item.isDemo && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Demo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap">
                    {item.disputeType}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-100 whitespace-nowrap tabular-nums">
                    ${item.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`font-mono font-semibold ${
                        isFight ? 'text-teal-400' : 'text-amber-400'
                      }`}
                    >
                      {item.decision}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200 whitespace-nowrap tabular-nums">
                    {item.confidence}%
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-400 whitespace-nowrap tabular-nums">
                    {primaryMemory}
                  </td>
                  <td
                    className={`py-3 px-4 font-mono font-medium whitespace-nowrap ${outcomeColor}`}
                  >
                    {item.outcome}
                  </td>
                  <td
                    className="py-3 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-3">
                      {onOpenOutcomeModal && (
                        <button
                          type="button"
                          onClick={() => onOpenOutcomeModal(item)}
                          className="px-2.5 py-1 text-[11px] font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded transition-colors"
                        >
                          POST /outcome
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
