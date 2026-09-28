import React from 'react';
import { NavigationTab } from '../types/precedent';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onQuickAnalyze: () => void;
  onExportCsv: () => void;
}

const NAV_ITEMS: { id: NavigationTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analyze', label: 'Analyze Case' },
  { id: 'history', label: 'Case History' },
  { id: 'memory', label: 'Memory' },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onQuickAnalyze,
  onExportCsv,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#070B14]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="text-left text-base font-semibold tracking-tight text-slate-100 hover:text-teal-300 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-sm"
        >
          PRECEDENT — Chargeback Intelligence
        </button>

        {/* Zone 2: 4 clean text navigation links */}
        <nav aria-label="Main Navigation" className="flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-sm ${
                  isActive
                    ? 'text-teal-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-teal-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onExportCsv}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            Export Ledger CSV
          </button>
          <button
            type="button"
            onClick={onQuickAnalyze}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            Analyze Dispute
          </button>
        </div>
      </div>
    </header>
  );
};
