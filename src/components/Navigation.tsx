import React, { useEffect, useState } from 'react';
import { ConnectionState, NavigationTab } from '../types/precedent';
import {
  BarChart3,
  BrainCircuit,
  FileSearch,
  GitMerge,
  GitPullRequest,
  History,
  LayoutDashboard,
  Menu,
  Play,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  backendStatus: ConnectionState;
  hindsightStatus: ConnectionState;
  lastAnalysisAt: string | null;
  onRefreshStatus: () => void;
  counts: {
    cases: number;
    memories: number;
    outcomes: number;
  };
  onOpenLiveDemo?: () => void;
}

const NAV_ITEMS: {
  id: NavigationTab;
  label: string;
  tooltip: string;
  icon: React.FC<{ className?: string }>;
  badgeKey?: 'cases' | 'memories' | 'outcomes';
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    tooltip: 'Real-time chargeback intelligence overview & Hindsight pipeline',
    icon: LayoutDashboard,
  },
  {
    id: 'analyze',
    label: 'Analyze Dispute',
    tooltip: 'Submit a dispute to POST /analyze for a memory-informed decision',
    icon: FileSearch,
  },
  {
    id: 'history',
    label: 'Case History',
    tooltip: 'Searchable ledger of analyzed cases & detailed case inspector',
    icon: History,
    badgeKey: 'cases',
  },
  {
    id: 'learning-chain',
    label: 'Learning Chain',
    tooltip: 'Inspect how precedent memory connects historical disputes (CB-001 → CB-002)',
    icon: GitMerge,
  },
  {
    id: 'memory',
    label: 'Memory',
    tooltip: 'Precedent lessons recalled from and retained in Hindsight',
    icon: BrainCircuit,
    badgeKey: 'memories',
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    tooltip: 'Record dispute outcomes via POST /outcome to train Hindsight',
    icon: GitPullRequest,
    badgeKey: 'outcomes',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    tooltip: 'Real-time operational analytics derived from live session data',
    icon: BarChart3,
  },
];

function StatusDot({ status }: { status: ConnectionState }) {
  if (status === 'connected') {
    return <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />;
  }
  if (status === 'checking') {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    );
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />;
}

function formatStatusLabel(status: ConnectionState): string {
  if (status === 'connected') return 'Connected';
  if (status === 'checking') return 'Checking...';
  return 'Disconnected';
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  backendStatus,
  hindsightStatus,
  lastAnalysisAt,
  onRefreshStatus,
  counts,
  onOpenLiveDemo,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close drawer on Escape key and lock body scroll while drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Left Sidebar: Reserved 64 (16rem / 256px) column */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:min-w-64 lg:max-w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-[#080D19] border-r border-slate-800/90 z-20 select-none">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#060D1A] border border-cyan-500/25 flex items-center justify-center p-0.5 shadow-sm shadow-cyan-950/40 group-hover:border-cyan-400/50 transition-colors">
              <img
                src="/precedent-logo.png"
                alt="Precedent Logo"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider text-slate-100 group-hover:text-teal-300 transition-colors">
                PRECEDENT
              </div>
              <div className="text-[11px] font-medium text-slate-400">
                Chargeback Intelligence
              </div>
            </div>
          </button>
        </div>

        {/* Live Proof of Learning Callout Button */}
        {onOpenLiveDemo && (
          <div className="px-3 pt-4 pb-1 shrink-0">
            <button
              type="button"
              onClick={onOpenLiveDemo}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500/20 to-teal-500/10 hover:from-teal-500/30 hover:to-teal-500/15 text-teal-300 border border-teal-500/40 shadow-sm transition-all group"
            >
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform fill-teal-400/30" />
                <span>Run Live Learning Demo</span>
              </span>
              <Sparkles className="w-3.5 h-3.5 text-teal-400/70" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          aria-label="Main Sidebar Navigation"
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        >
          <div className="px-2.5 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Dispute Operations
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

            return (
              <button
                key={item.id}
                type="button"
                title={item.tooltip}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-teal-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {badgeCount > 0 && (
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 tabular-nums">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Persistent Connection & Telemetry Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#060A12] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              System Telemetry
            </span>
            <button
              type="button"
              onClick={onRefreshStatus}
              title="Verify API connection status"
              className="text-slate-400 hover:text-teal-400 transition-colors p-1 rounded"
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  backendStatus === 'checking' ? 'animate-spin text-teal-400' : ''
                }`}
              />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Backend</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                <StatusDot status={backendStatus} />
                <span>{formatStatusLabel(backendStatus)}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Hindsight</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                <StatusDot status={hindsightStatus} />
                <span>{formatStatusLabel(hindsightStatus)}</span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-500">Last Analysis</span>
              <span className="font-mono text-[11px] text-slate-300 tabular-nums truncate">
                {lastAnalysisAt || 'No analysis run yet'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Fixed Top Header Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#080D19]/95 backdrop-blur-md border-b border-slate-800/90 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#060D1A] border border-cyan-500/25 flex items-center justify-center p-0.5 shadow-sm shadow-cyan-950/40">
              <img
                src="/precedent-logo.png"
                alt="Precedent Logo"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider text-slate-100 block leading-none group-hover:text-teal-300 transition-colors">
                PRECEDENT
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Chargeback Intelligence
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-300 bg-[#0C1322] border border-slate-800 px-2.5 py-1 rounded-md">
              <span className="flex items-center gap-1.5">
                <StatusDot status={backendStatus} />
                <span>Backend: {formatStatusLabel(backendStatus)}</span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5">
                <StatusDot status={hindsightStatus} />
                <span>Hindsight: {formatStatusLabel(hindsightStatus)}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-800 rounded-lg transition-colors"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Collapsible Drawer with Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            className="relative flex flex-col w-72 sm:w-80 max-w-[85vw] h-full bg-[#080D19] border-r border-slate-800 shadow-2xl z-50 select-none animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header with Close Button */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#060D1A] border border-cyan-500/25 flex items-center justify-center p-0.5 shadow-sm shadow-cyan-950/40">
                  <img
                    src="/precedent-logo.png"
                    alt="Precedent Logo"
                    className="w-full h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-wider text-slate-100">
                    PRECEDENT
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Chargeback Intelligence
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Run Live Learning Demo Callout */}
            {onOpenLiveDemo && (
              <div className="px-3 pt-3 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onOpenLiveDemo();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500/20 to-teal-500/10 hover:from-teal-500/30 hover:to-teal-500/15 text-teal-300 border border-teal-500/40 shadow-sm transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-teal-400 fill-teal-400/30" />
                    <span>Run Live Learning Demo</span>
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-teal-400/70" />
                </button>
              </div>
            )}

            {/* Navigation items list */}
            <nav
              aria-label="Mobile Navigation"
              className="flex-1 px-3 py-3 space-y-1 overflow-y-auto"
            >
              <div className="px-2.5 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Dispute Operations
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                        : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-teal-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {badgeCount > 0 && (
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 tabular-nums">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer Telemetry */}
            <div className="p-4 border-t border-slate-800/80 bg-[#060A12] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  System Telemetry
                </span>
                <button
                  type="button"
                  onClick={onRefreshStatus}
                  title="Verify API connection status"
                  className="text-slate-400 hover:text-teal-400 transition-colors p-1 rounded"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${
                      backendStatus === 'checking' ? 'animate-spin text-teal-400' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Backend</span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                    <StatusDot status={backendStatus} />
                    <span>{formatStatusLabel(backendStatus)}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Hindsight</span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                    <StatusDot status={hindsightStatus} />
                    <span>{formatStatusLabel(hindsightStatus)}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500">Last Analysis</span>
                  <span className="font-mono text-[11px] text-slate-300 tabular-nums truncate">
                    {lastAnalysisAt || 'No analysis run yet'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
