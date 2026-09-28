import React from 'react';
import { EvidenceItem } from '../types/precedent';

interface EvidenceListProps {
  items: EvidenceItem[];
  isDemo?: boolean;
}

export const EvidenceList: React.FC<EvidenceListProps> = ({
  items,
  isDemo = false,
}) => {
  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-100">
            Recommended Evidence (<code className="font-mono text-sm text-teal-400">evidence_to_submit</code>)
          </h3>
          {isDemo && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Demo
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-slate-400 tabular-nums">
          {items.length} item(s)
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-xs text-slate-400">
          No evidence_to_submit items returned for this case.
        </p>
      ) : (
        <div className="divide-y divide-slate-800/70">
          {items.map((item) => {
            const isPresent = item.status === 'PRESENT';
            const isGap = item.status === 'CRITICAL_GAP';

            const statusText = isPresent
              ? 'Provided in Case'
              : isGap
              ? 'Missing — Influenced by Hindsight Recall'
              : 'Recommended to Submit';

            const statusColor = isPresent
              ? 'text-teal-400'
              : isGap
              ? 'text-rose-400'
              : 'text-cyan-400';

            return (
              <div
                key={item.id}
                className="py-4 first:pt-4 last:pb-0 space-y-1"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-medium ${statusColor}`}>
                    {statusText}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-400">{item.category}</span>
                </div>

                <div className="text-sm font-semibold text-slate-100">
                  {item.label}
                </div>

                {item.description && (
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[70ch]">
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
