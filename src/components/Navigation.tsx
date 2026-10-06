import React from 'react';
import { DataMode, NavigationTab } from '../types/precedent';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onQuickAnalyze: () => void;
  onExportCsv: () => void;
  dataMode: DataMode;
  onSelectDataMode: (mode: DataMode) => void;
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
  dataMode,
  onSelectDataMode,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#070B14]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        {/* Zone 1: Single text element wordmark + current mode indicator */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="text-left text-base font-semibold tracking-tight text-slate-100 hover:text-teal-300 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-sm"
          >
            PRECEDENT — Chargeback Intelligence
          </button>
          <span
            className={`hidden md:inline-block text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
              dataMode === 'live'
                ? 'text-teal-300 border-teal-500/40 bg-teal-500/10'
                : 'text-amber-300 border-amber-500/40 bg-amber-500/10'
            }`}
          >
            {dataMode === 'live' ? 'LIVE MODE' : 'DEMO MODE'}
          </span>
        </div>

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

        {/* Zone 3: Mode Switch (LIVE / DEMO) and primary actions */}
        <div className="flex items-center gap-3">
          {/* Mode Switch: LIVE vs DEMO */}
          <div
            role="group"
            aria-label="Application Data Mode"
            className="flex items-center gap-0.5 p-0.5 bg-[#0A101D] border border-slate-800 rounded-lg shrink-0"
          >
            <button
              type="button"
              onClick={() => onSelectDataMode('live')}
              title="Switch to Live mode (real session activity and live Hindsight telemetry)"
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-md transition-colors ${
                dataMode === 'live'
                  ? 'bg-teal-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LIVE
            </button>
            <button
              type="button"
              onClick={() => onSelectDataMode('demo')}
              title="Switch to Demo mode (seeded CB-001/CB-002 walkthrough)"
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-md transition-colors ${
                dataMode === 'demo'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DEMO
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={onExportCsv}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Export CSV
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
      </div>
    </header>
  );
};
