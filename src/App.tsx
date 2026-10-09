import React, { useMemo, useState } from 'react';
import {
  CaseFormInput,
  ChargebackCase,
  MemoryEntry,
  NavigationTab,
  OutcomeFormInput,
} from './types/precedent';
import {
  computeNextCaseId,
  EMPTY_ANALYZE_INPUT,
  EMPTY_OUTCOME_INPUT,
  INTAKE_EXAMPLES,
  OUTCOME_EXAMPLES,
} from './data/demoData';
import { extractSourceCaseId, getApiBaseUrl } from './services/api';
import { usePrecedentStore } from './store/usePrecedentStore';
import { Navigation } from './components/Navigation';
import { StatCard } from './components/StatCard';
import { CaseForm } from './components/CaseForm';
import { DecisionCard } from './components/DecisionCard';
import { LearningFromOutcomesSection } from './components/LearningFromOutcomesSection';
import { DecisionAuditTrail } from './components/DecisionAuditTrail';
import { MemoryImpactCard } from './components/MemoryImpactCard';
import { EvidenceList } from './components/EvidenceList';
import { MemoryCard } from './components/MemoryCard';
import { HindsightPrecedentsSection } from './components/HindsightPrecedentsSection';
import { CaseHistoryTable } from './components/CaseHistoryTable';
import { LearningChainView } from './components/LearningChainView';
import { LiveLearningDemoModal } from './components/LiveLearningDemoModal';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  FolderGit2,
  GitMerge,
  GitPullRequest,
  History,
  Loader2,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

const ANALYSIS_LOADING_STAGES = [
  'Recalling relevant Hindsight precedents...',
  'Comparing dispute evidence against historical outcomes...',
  'Generating recommendation...',
];

const SEQUENTIAL_WORKFLOW_STEPS = [
  {
    step: '01',
    label: 'Analyze CB-001',
    sublabel: 'POST /analyze',
  },
  {
    step: '02',
    label: 'Record actual outcome',
    sublabel: 'WON or LOST',
  },
  {
    step: '03',
    label: 'Retain lesson in Hindsight',
    sublabel: 'POST /outcome',
  },
  {
    step: '04',
    label: 'Start CB-002',
    sublabel: 'New Case Action',
  },
  {
    step: '05',
    label: 'Analyze CB-002',
    sublabel: 'POST /analyze',
  },
  {
    step: '06',
    label: 'Recall relevant precedent from CB-001',
    sublabel: 'Recalled from Hindsight',
  },
];

const CORE_HINDSIGHT_LOOP_STEPS = [
  {
    step: '01',
    title: 'CURRENT DISPUTE',
    tag: 'Dispute Intake',
    description:
      'Inbound dispute submitted with Case ID, dispute type, dollar amount, customer claim, and merchant evidence.',
  },
  {
    step: '02',
    title: 'HINDSIGHT RECALL',
    tag: 'POST /analyze',
    description:
      'Semantic and temporal retrieval queries persistent Hindsight memory to surface similar past disputes.',
  },
  {
    step: '03',
    title: 'PREVIOUS PRECEDENT',
    tag: 'Precedent Match',
    description:
      'Identifies relevant precedent (e.g. CB-001) with matching dispute patterns, prior arbitration outcome, and past merchant errors.',
  },
  {
    step: '04',
    title: 'LESSON',
    tag: 'Retained Insight',
    description:
      'Extracts the specific lesson retained from past outcomes (e.g. prioritize cancellation records and customer communication).',
  },
  {
    step: '05',
    title: 'EVIDENCE STRATEGY',
    tag: 'Adaptive Strategy',
    description:
      'Pinpoints memory-identified evidence gaps and generates a tailored evidence submission strategy to address vulnerabilities.',
  },
  {
    step: '06',
    title: 'AI DECISION',
    tag: 'Calibrated Output',
    description:
      'Produces calibrated FIGHT or FOLD recommendation with confidence score and evidence-backed rationale.',
  },
  {
    step: '07',
    title: 'ACTUAL OUTCOME',
    tag: 'Arbitration Result',
    description:
      'Issuer or card network arbitration outcome is recorded (WON or LOST) with actual resolution details.',
  },
  {
    step: '08',
    title: 'NEW MEMORY',
    tag: 'POST /outcome Retain',
    description:
      'Retains the new outcome and learned lesson into Hindsight persistent memory, making it immediately available to future cases.',
  },
];

export default function App() {
  const {
    cases,
    memories,
    outcomes,
    currentAnalysis,
    currentDisputeAmount,
    lastAnalysisAt,
    backendStatus,
    hindsightStatus,
    isAnalyzing,
    analysisStageIndex,
    isSubmittingOutcome,
    isSyncingDemoToHindsight,
    syncedDemoCaseIds,
    analyzeError,
    outcomeError,
    toasts,
    metrics,
    runAnalyze,
    recordOutcome,
    syncDemoToHindsight,
    refreshConnectionStatus,
    dismissToast,
    clearAnalyzeError,
    clearOutcomeError,
    setCurrentAnalysisView,
    registerRetainedOutcome,
    registerAnalyzedCase,
  } = usePrecedentStore();

  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Analyze Dispute Form State (starts ready with CB-001 for the sequential precedent flow)
  const [formData, setFormData] = useState<CaseFormInput>(
    INTAKE_EXAMPLES[0]?.data || EMPTY_ANALYZE_INPUT
  );

  // Record Outcome Form State
  const [outcomeForm, setOutcomeForm] = useState<OutcomeFormInput>(
    OUTCOME_EXAMPLES[0]?.data || EMPTY_OUTCOME_INPUT
  );
  const [outcomeRetainedBanner, setOutcomeRetainedBanner] = useState<
    string | null
  >(null);

  // Case History Filter, Scope & Inspection State
  const [historyScopeFilter, setHistoryScopeFilter] = useState<
    'ALL' | 'LIVE' | 'DEMO'
  >('ALL');
  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | 'FIGHT' | 'FOLD' | 'WON' | 'LOST' | 'UNRECORDED'
  >('ALL');
  const [historyCaseIdFilter, setHistoryCaseIdFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Learning Chain Focused Case ID
  const [learningChainFocusCaseId, setLearningChainFocusCaseId] = useState<
    string | null
  >('CB-001');

  // Live Proof of Learning Modal State
  const [liveDemoOpen, setLiveDemoOpen] = useState(false);

  // Outcomes Tab Scope State
  const [outcomesScopeFilter, setOutcomesScopeFilter] = useState<
    'ALL' | 'LIVE' | 'DEMO'
  >('ALL');

  // Analytics Tab Scope State
  const [analyticsScope, setAnalyticsScope] = useState<'LIVE' | 'DEMO' | 'ALL'>(
    'LIVE'
  );

  // Memory Explorer Filter & Search State
  const [memorySearch, setMemorySearch] = useState('');
  const [memorySourceFilter, setMemorySourceFilter] = useState<
    'ALL' | 'RECALLED FROM HINDSIGHT' | 'RETAINED IN HINDSIGHT'
  >('ALL');

  const inspectedCase: ChargebackCase | null = useMemo(() => {
    if (cases.length === 0) return null;
    if (selectedCaseId) {
      return cases.find((c) => c.id === selectedCaseId) || cases[0];
    }
    return cases[0];
  }, [cases, selectedCaseId]);

  // Check if the currently displayed analysis has a recorded outcome in this session
  const currentAnalysisCaseRecord = useMemo(() => {
    if (!currentAnalysis) return undefined;
    return cases.find(
      (c) => c.caseId.toLowerCase() === currentAnalysis.caseId.toLowerCase()
    );
  }, [cases, currentAnalysis]);

  const currentAnalysisRecordedOutcome = useMemo(() => {
    if (!currentAnalysis) return undefined;
    return outcomes.find(
      (o) => o.caseId.toLowerCase() === currentAnalysis.caseId.toLowerCase()
    );
  }, [outcomes, currentAnalysis]);

  const currentAnalysisPreviousCaseRecord = useMemo(() => {
    if (!currentAnalysis) return undefined;
    const recalledId =
      currentAnalysis.displayedPrecedents?.[0]?.caseId ||
      currentAnalysis.relevant_precedent?.split(/[·\s]/)[0] ||
      'CB-001';
    return (
      cases.find((c) => c.caseId.toLowerCase() === recalledId.toLowerCase()) ||
      cases.find((c) => c.caseId.toLowerCase() === 'cb-001') ||
      cases.find((c) => c.caseId.toLowerCase() === 'demo-cb-001')
    );
  }, [cases, currentAnalysis]);

  const inspectedPreviousCaseRecord = useMemo(() => {
    if (!inspectedCase) return undefined;
    const recalledId =
      inspectedCase.analysis.displayedPrecedents?.[0]?.caseId ||
      inspectedCase.analysis.relevant_precedent?.split(/[·\s]/)[0] ||
      'CB-001';
    return (
      cases.find((c) => c.caseId.toLowerCase() === recalledId.toLowerCase()) ||
      cases.find((c) => c.caseId.toLowerCase() === 'cb-001') ||
      cases.find((c) => c.caseId.toLowerCase() === 'demo-cb-001')
    );
  }, [cases, inspectedCase]);

  // Group all session memories by Source Case ID on the Memory Explorer page
  const groupedExplorerMemories = useMemo(() => {
    const q = memorySearch.trim().toLowerCase();
    const filtered = memories.filter((m) => {
      const matchesSource =
        memorySourceFilter === 'ALL' || m.sourceType === memorySourceFilter;
      const matchesQuery =
        !q ||
        m.memoryCode.toLowerCase().includes(q) ||
        (m.caseIdOrigin && m.caseIdOrigin.toLowerCase().includes(q)) ||
        m.patternTitle.toLowerCase().includes(q) ||
        m.disputeType.toLowerCase().includes(q) ||
        m.lesson.toLowerCase().includes(q);
      return matchesSource && matchesQuery;
    });

    const groups = new Map<
      string,
      { sourceCaseId: string; memories: MemoryEntry[] }
    >();

    filtered.forEach((mem) => {
      const key =
        mem.caseIdOrigin ||
        extractSourceCaseId(mem.lesson) ||
        mem.memoryCode ||
        'Prior Precedent';
      const group = groups.get(key) || { sourceCaseId: key, memories: [] };
      if (
        !group.memories.some(
          (existing) =>
            existing.lesson.trim().toLowerCase() ===
              mem.lesson.trim().toLowerCase() &&
            existing.sourceType === mem.sourceType
        )
      ) {
        group.memories.push(mem);
      }
      groups.set(key, group);
    });

    return Array.from(groups.values());
  }, [memories, memorySearch, memorySourceFilter]);

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await runAnalyze(formData);
    if (result) {
      setOutcomeRetainedBanner(null);
    }
  };

  /**
   * "New Case" action:
   * - Preserves all previous cases in Case History
   * - Generates a sensible next sequential Case ID (e.g. CB-001 -> CB-002 -> CB-003)
   *   while allowing the user to edit/enter any Case ID manually
   * - Clears the active analysis display so the user starts a fresh case cleanly
   */
  const handleStartNewCase = (explicitCaseId?: string) => {
    const nextId =
      explicitCaseId ||
      computeNextCaseId(
        formData.caseId,
        cases.map((c) => c.caseId)
      );

    const matchingTemplate = INTAKE_EXAMPLES.find(
      (preset) => preset.data.caseId.toUpperCase() === nextId.toUpperCase()
    );

    if (matchingTemplate) {
      setFormData({ ...matchingTemplate.data });
    } else {
      setFormData({
        caseId: nextId,
        disputeType: formData.disputeType || 'Subscription',
        amount: '',
        customerClaim: '',
        merchantEvidence: '',
      });
    }

    setCurrentAnalysisView(null, 0);
    clearAnalyzeError();
    setActiveTab('analyze');
  };

  /**
   * Load an existing stored case from Case History into the Analyze workspace
   */
  const handleSelectStoredCaseInWorkspace = (storedCase: ChargebackCase) => {
    setFormData({
      caseId: storedCase.caseId,
      disputeType: storedCase.disputeType,
      amount: String(storedCase.amount),
      customerClaim: storedCase.customerClaim,
      merchantEvidence: storedCase.merchantEvidence,
    });
    setCurrentAnalysisView(storedCase.analysis, storedCase.amount);
    clearAnalyzeError();
    setActiveTab('analyze');
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutcomeRetainedBanner(null);
    const ok = await recordOutcome(outcomeForm);
    if (ok) {
      setOutcomeRetainedBanner(
        `Outcome retained in Hindsight — Case ${outcomeForm.caseId} (${outcomeForm.outcome}) lesson is now stored in Hindsight persistent memory. Start your next case to recall this precedent.`
      );
    }
  };

  const handleOpenOutcomeForCase = (
    caseId: string,
    disputeCase?: ChargebackCase
  ) => {
    const matched =
      disputeCase ||
      cases.find((c) => c.caseId.toLowerCase() === caseId.trim().toLowerCase());

    const isCB001 = caseId.trim().toUpperCase() === 'CB-001';

    setOutcomeForm({
      caseId: caseId.trim() || 'CB-001',
      outcome: matched?.outcome === 'WON' ? 'WON' : 'LOST',
      actualResult:
        matched?.actualResult ||
        (isCB001
          ? OUTCOME_EXAMPLES[0].data.actualResult
          : matched
          ? `Dispute on ${matched.disputeType} ($${matched.amount.toFixed(
              2
            )}) where customer claimed: "${matched.customerClaim}"`
          : ''),
      lesson:
        matched?.lessonRetained ||
        (isCB001 ? OUTCOME_EXAMPLES[0].data.lesson : ''),
    });
    clearOutcomeError();
    setOutcomeRetainedBanner(null);
    setActiveTab('outcomes');
  };

  const handleUseMemoryInAnalyzer = (memory: MemoryEntry) => {
    const nextId = computeNextCaseId(
      memory.caseIdOrigin || formData.caseId,
      cases.map((c) => c.caseId)
    );
    handleStartNewCase(nextId);
  };

  const handleExportCsv = () => {
    if (cases.length === 0) return;
    const headers = [
      'Case ID',
      'Dispute Type',
      'Amount USD',
      'Baseline Recommendation',
      'Final Recommendation',
      'Confidence %',
      'Memory Used',
      'Unique Precedents Count',
      'Raw Memories Recalled Count',
      'Outcome Recorded',
      'Outcome',
      'Submitted At',
    ];
    const rows = cases.map((c) => [
      c.caseId,
      `"${c.disputeType.replace(/"/g, '""')}"`,
      c.amount.toFixed(2),
      c.analysis.baseline_recommendation || 'N/A',
      c.decision,
      c.confidence,
      c.analysis.memory_used ? 'true' : 'false',
      c.analysis.uniquePrecedentsCount,
      c.analysis.recalled_memories.length,
      c.outcomeRecorded ? 'true' : 'false',
      c.outcomeRecorded ? c.outcome : 'NOT_RECORDED',
      c.submittedAt,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'precedent_live_cases.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesScope =
        historyScopeFilter === 'ALL'
          ? true
          : historyScopeFilter === 'LIVE'
          ? !c.isSyntheticDemo
          : Boolean(c.isSyntheticDemo);

      const matchesStatus =
        historyFilter === 'ALL'
          ? true
          : historyFilter === 'FIGHT' || historyFilter === 'FOLD'
          ? c.decision === historyFilter
          : historyFilter === 'UNRECORDED'
          ? !c.outcomeRecorded
          : c.outcomeRecorded && c.outcome === historyFilter;

      const caseIdQ = historyCaseIdFilter.trim().toLowerCase();
      const matchesCaseId =
        !caseIdQ || c.caseId.toLowerCase().includes(caseIdQ);

      const q = historySearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        c.disputeType.toLowerCase().includes(q) ||
        c.customerClaim.toLowerCase().includes(q) ||
        c.merchantEvidence.toLowerCase().includes(q);

      return matchesScope && matchesStatus && matchesCaseId && matchesSearch;
    });
  }, [
    cases,
    historyScopeFilter,
    historyFilter,
    historyCaseIdFilter,
    historySearch,
  ]);

  // Analytics derived with scope separation (LIVE vs DEMO vs ALL)
  const analyticsData = useMemo(() => {
    const scopedCases =
      analyticsScope === 'ALL'
        ? cases
        : analyticsScope === 'LIVE'
        ? cases.filter((c) => !c.isSyntheticDemo)
        : cases.filter((c) => Boolean(c.isSyntheticDemo));

    const scopedOutcomes =
      analyticsScope === 'ALL'
        ? outcomes
        : analyticsScope === 'LIVE'
        ? outcomes.filter((o) => !o.isSyntheticDemo)
        : outcomes.filter((o) => Boolean(o.isSyntheticDemo));

    const totalCases = scopedCases.length;
    const fightCount = scopedCases.filter((c) => c.decision === 'FIGHT').length;
    const foldCount = scopedCases.filter((c) => c.decision === 'FOLD').length;
    const memoryGuidedCount = scopedCases.filter(
      (c) => c.analysis.memory_used
    ).length;
    const baselineTransitions = scopedCases.filter(
      (c) =>
        c.analysis.baseline_recommendation &&
        c.analysis.baseline_recommendation.toUpperCase() !== c.decision
    ).length;
    const avgConfidence =
      totalCases > 0
        ? Math.round(
            scopedCases.reduce((acc, c) => acc + c.confidence, 0) / totalCases
          )
        : 0;
    const totalDisputedVolume = scopedCases.reduce(
      (acc, c) => acc + c.amount,
      0
    );
    const wonCount = scopedOutcomes.filter((o) => o.outcome === 'WON').length;
    const lostCount = scopedOutcomes.filter((o) => o.outcome === 'LOST').length;

    const byDisputeType: Record<
      string,
      { count: number; fight: number; fold: number; memoryUsed: number }
    > = {};
    scopedCases.forEach((c) => {
      if (!byDisputeType[c.disputeType]) {
        byDisputeType[c.disputeType] = {
          count: 0,
          fight: 0,
          fold: 0,
          memoryUsed: 0,
        };
      }
      byDisputeType[c.disputeType].count += 1;
      if (c.decision === 'FIGHT') byDisputeType[c.disputeType].fight += 1;
      else byDisputeType[c.disputeType].fold += 1;
      if (c.analysis.memory_used) byDisputeType[c.disputeType].memoryUsed += 1;
    });

    return {
      totalCases,
      fightCount,
      foldCount,
      memoryGuidedCount,
      baselineTransitions,
      avgConfidence,
      totalDisputedVolume,
      wonCount,
      lostCount,
      byDisputeType: Object.entries(byDisputeType),
    };
  }, [cases, outcomes, analyticsScope]);

  const configuredBaseUrl = getApiBaseUrl() || '(relative / same-origin)';

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-row">
      {/* Sidebar Navigation: fixed-width container on desktop, hidden-by-default drawer with backdrop on mobile */}
      <div className="shrink-0 lg:w-64 lg:min-w-64 lg:max-w-64">
        <Navigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          backendStatus={backendStatus}
          hindsightStatus={hindsightStatus}
          lastAnalysisAt={lastAnalysisAt}
          onRefreshStatus={refreshConnectionStatus}
          counts={{
            cases: cases.length,
            memories: metrics.uniquePrecedents || memories.length,
            outcomes: outcomes.length,
          }}
          onOpenLiveDemo={() => setLiveDemoOpen(true)}
        />
      </div>

      {/* Main Content Workspace Container (Takes 100% of remaining width adjacent to sidebar, min-w-0 prevents clipping) */}
      <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0 overflow-x-hidden">
        {/* Real-Time Toast Notification Stack */}
        {toasts.length > 0 && (
          <div
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all ${
                  toast.type === 'success'
                    ? 'bg-[#08151A]/95 border-teal-500/40 text-teal-100'
                    : toast.type === 'error'
                    ? 'bg-[#1A0B12]/95 border-rose-500/40 text-rose-100'
                    : 'bg-[#0C1322]/95 border-slate-700 text-slate-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {toast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 text-xs">
                    <div className="font-semibold">{toast.title}</div>
                    <div className="text-slate-300 leading-relaxed">
                      {toast.message}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 mx-auto">
        {/* ==================== VIEW 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Page Header with Enterprise Positioning */}
            <div className="border-b border-slate-800/80 pb-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-400 mb-1">
                    <span>Chargeback Intelligence Platform</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                    PRECEDENT — Chargeback Intelligence
                  </h1>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl font-medium leading-relaxed">
                    An AI chargeback analyst that learns from previous dispute outcomes and applies historical experience to future decisions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLiveDemoOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-sm transition-all whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950/30" />
                    <span>Run Live Learning Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartNewCase()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Case</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:text-white bg-[#0C1322] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Case History ({cases.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLearningChainFocusCaseId('CB-001');
                      setActiveTab('learning-chain');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Learning Chain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenOutcomeForCase(
                        currentAnalysis?.caseId || formData.caseId || 'CB-001'
                      )
                    }
                    className="px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:text-white bg-[#0C1322] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Record Outcome
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('analyze')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Analyze Dispute</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Central Concept: Continuous Intelligence Loop Banner */}
              <div className="bg-[#090E1A] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    The Precedent Continuous Learning Cycle:
                  </span>
                </div>
                <div className="inline-flex flex-wrap items-center gap-1.5 text-xs font-mono font-medium">
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    ANALYZE
                  </span>
                  <span className="text-slate-600 font-sans">→</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    REMEMBER
                  </span>
                  <span className="text-slate-600 font-sans">→</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    RECALL
                  </span>
                  <span className="text-slate-600 font-sans">→</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    APPLY
                  </span>
                  <span className="text-slate-600 font-sans">→</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    OUTCOME
                  </span>
                  <span className="text-slate-600 font-sans">→</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    LEARN
                  </span>
                </div>
              </div>
            </div>

            {/* Live Operational Metrics (Strictly Real Live Activity; Demo Cases Excluded; No Fabricated Rates) */}
            <section
              aria-label="Live Operational Metrics"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              <StatCard
                label="Cases Analyzed"
                value={metrics.casesAnalyzed}
                deltaText="POST /analyze"
                deltaTone="positive"
                subtext="Live disputes evaluated by the connected FastAPI backend"
                onClick={() => setActiveTab('history')}
              />
              <StatCard
                label="Unique Precedents"
                value={metrics.uniquePrecedents}
                deltaText="Consolidated Case IDs"
                deltaTone="positive"
                subtext="Unique precedent Case IDs consolidated from recalled memories"
                onClick={() => setActiveTab('memory')}
              />
              <StatCard
                label="Memories Recalled"
                value={metrics.memoriesRecalled}
                deltaText="Raw Hindsight Entries"
                deltaTone="accent"
                subtext="Actual number of raw memory entries returned by Hindsight"
                onClick={() => setActiveTab('memory')}
              />
              <StatCard
                label="Outcomes Learned"
                value={metrics.outcomesLearned}
                deltaText="POST /outcome"
                deltaTone="positive"
                subtext="Dispute outcomes retained in Hindsight persistent memory"
                onClick={() => setActiveTab('outcomes')}
              />
              <StatCard
                label="Cases Improved by Memory"
                value={
                  metrics.casesAnalyzed > 0 && metrics.memoryGuidedDecisions > 0
                    ? metrics.memoryGuidedDecisions
                    : 'Not enough historical data'
                }
                deltaText={
                  metrics.casesAnalyzed > 0 && metrics.memoryGuidedDecisions > 0
                    ? `${metrics.memoryGuidedDecisions} of ${metrics.casesAnalyzed} live cases`
                    : 'Awaiting live outcome evaluations'
                }
                deltaTone={
                  metrics.casesAnalyzed > 0 && metrics.memoryGuidedDecisions > 0
                    ? 'positive'
                    : 'neutral'
                }
                subtext="Cases where recalled historical precedent measurably guided recommendation"
                onClick={() => setActiveTab('analytics')}
              />
            </section>

            {/* The Core Hindsight Memory Loop & Active Dispute Workspace */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 Cols: The Core Hindsight Memory Loop (Centerpiece) */}
              <div className="lg:col-span-5 bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-4">
                <div className="border-b border-slate-800/80 pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-teal-400" />
                      <span>The Core Hindsight Memory Loop</span>
                    </h2>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 rounded font-bold">
                      Adaptive Loop
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    Precedent is not a one-shot AI system. It learns from outcomes.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Every resolved dispute feeds persistent memory so future similar cases avoid past merchant errors.
                  </p>
                </div>

                {/* 8-Stage Clean Enterprise Workflow: CURRENT DISPUTE → HINDSIGHT RECALL → PREVIOUS PRECEDENT → LESSON → EVIDENCE STRATEGY → AI DECISION → ACTUAL OUTCOME → NEW MEMORY */}
                <div className="flex flex-col items-center space-y-2">
                  {CORE_HINDSIGHT_LOOP_STEPS.map((node, idx) => (
                    <React.Fragment key={node.step}>
                      <div className="w-full bg-[#080D19] border border-slate-800/90 rounded-lg p-3 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold tracking-wider text-teal-400 flex items-center gap-1.5">
                            <span className="text-slate-500">{node.step}.</span>
                            <span>{node.title}</span>
                          </span>
                          <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                            {node.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {node.description}
                        </p>
                      </div>
                      {idx < CORE_HINDSIGHT_LOOP_STEPS.length - 1 && (
                        <div className="flex items-center justify-center py-0.5">
                          <ArrowDown className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Right 7 Cols: Latest Live Analysis Snapshot OR Sequential Workflow Launcher */}
              <div className="lg:col-span-7 space-y-6">
                {currentAnalysis ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-semibold text-slate-100">
                        Active Case Workspace ({currentAnalysis.caseId})
                      </h2>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleStartNewCase()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Start Next Case</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('analyze')}
                          className="text-xs font-medium text-slate-300 hover:text-white"
                        >
                          Open Full Workspace →
                        </button>
                      </div>
                    </div>
                    <DecisionCard
                      analysis={currentAnalysis}
                      disputeAmount={currentDisputeAmount}
                      outcomeRecorded={
                        currentAnalysisCaseRecord?.outcomeRecorded
                      }
                      recordedOutcomeValue={currentAnalysisCaseRecord?.outcome}
                      onOpenOutcomeForm={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                      onStartNewCase={() => handleStartNewCase()}
                    />
                    <LearningFromOutcomesSection
                      analysis={currentAnalysis}
                      currentCaseRecord={currentAnalysisCaseRecord}
                      currentRecordedOutcome={currentAnalysisRecordedOutcome}
                      previousCaseRecord={currentAnalysisPreviousCaseRecord}
                      onOpenRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                      onViewLearningChain={() => {
                        setLearningChainFocusCaseId(
                          currentAnalysis.caseId || 'CB-001'
                        );
                        setActiveTab('learning-chain');
                      }}
                    />
                    <MemoryImpactCard analysis={currentAnalysis} />
                    <EvidenceList analysis={currentAnalysis} />
                    <HindsightPrecedentsSection
                      analysis={currentAnalysis}
                      onRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                    />
                  </div>
                ) : (
                  <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-100">
                          Sequential Case Precedent Walkthrough: CB-001 → CB-002
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          An unrecorded case is not a historical precedent until its outcome is recorded and retained in Hindsight.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('analyze')}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Open Analyze Workspace →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="font-mono text-[11px] text-teal-400 font-bold">
                            1. ANALYZE CB-001
                          </span>
                          <div className="font-semibold text-slate-100">
                            Initial Subscription Case ($89.99)
                          </div>
                          <p className="text-slate-400 leading-relaxed">
                            Analyze <code className="font-mono text-slate-200">CB-001</code> first. Its outcome is not yet recorded in Hindsight.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(INTAKE_EXAMPLES[0].data);
                            setCurrentAnalysisView(null, 0);
                            setActiveTab('analyze');
                          }}
                          className="mt-3 w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium transition-colors text-center"
                        >
                          1. Load CB-001 Input
                        </button>
                      </div>

                      <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="font-mono text-[11px] text-cyan-400 font-bold">
                            2. RECORD &amp; RETAIN CB-001
                          </span>
                          <div className="font-semibold text-slate-100">
                            Retain LOST Lesson in Hindsight
                          </div>
                          <p className="text-slate-400 leading-relaxed">
                            Record actual outcome (<code className="font-mono text-rose-300">LOST</code>) via <code className="font-mono">POST /outcome</code> to retain the lesson in Hindsight.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOutcomeForm(OUTCOME_EXAMPLES[0].data);
                            setActiveTab('outcomes');
                          }}
                          className="mt-3 w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium transition-colors text-center"
                        >
                          2. Record CB-001 Outcome
                        </button>
                      </div>

                      <div className="bg-[#080D19] border border-teal-500/30 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="font-mono text-[11px] text-teal-400 font-bold">
                            3. START &amp; ANALYZE CB-002
                          </span>
                          <div className="font-semibold text-slate-100">
                            Recall Consolidated Precedent
                          </div>
                          <p className="text-slate-400 leading-relaxed">
                            Start <code className="font-mono text-teal-300">CB-002</code> ($129.99) and analyze it to recall the consolidated <code className="font-mono text-teal-300">CB-001</code> precedent.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(INTAKE_EXAMPLES[1].data);
                            setCurrentAnalysisView(null, 0);
                            setActiveTab('analyze');
                          }}
                          className="mt-3 w-full py-2 px-3 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-semibold transition-colors text-center"
                        >
                          3. Start CB-002 Input
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Live Session Cases Table */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Case History ({cases.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real cases analyzed during this session — click any row to inspect stored analysis and consolidated precedents
                  </p>
                </div>
                {cases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Open Full Case History →
                  </button>
                )}
              </div>

              <CaseHistoryTable
                cases={cases.slice(0, 5)}
                selectedCaseId={inspectedCase?.id}
                onSelectCase={(item) => {
                  setSelectedCaseId(item.id);
                  setActiveTab('history');
                }}
                onRecordOutcome={(item) =>
                  handleOpenOutcomeForCase(item.caseId, item)
                }
                onNavigateAnalyze={() => setActiveTab('analyze')}
              />
            </section>
          </div>
        )}

        {/* ==================== VIEW 2: ANALYZE DISPUTE ==================== */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            {/* Enterprise Case Management Bar at Top of Analyze Dispute Workspace */}
            <div className="bg-[#0C1322] border border-slate-800/90 rounded-xl p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Prominent Current Case ID Input & Quick Sequence Selector */}
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label
                      htmlFor="topWorkspaceCaseId"
                      className="block text-[10px] font-mono uppercase tracking-wider text-teal-400 mb-1"
                    >
                      Current Case ID (sent to POST /analyze)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="topWorkspaceCaseId"
                        type="text"
                        value={formData.caseId}
                        disabled={isAnalyzing}
                        onChange={(e) =>
                          setFormData({ ...formData, caseId: e.target.value })
                        }
                        placeholder="CB-001"
                        className="w-36 px-3 py-2 text-sm font-mono font-bold bg-[#070B14] border border-teal-500/40 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      />

                      <div className="flex items-center gap-1.5">
                        {(['CB-001', 'CB-002', 'CB-003'] as const).map(
                          (presetId) => {
                            const isCurrent =
                              formData.caseId.trim().toUpperCase() === presetId;
                            const analyzedCase = cases.find(
                              (c) => c.caseId.toUpperCase() === presetId
                            );
                            return (
                              <button
                                key={presetId}
                                type="button"
                                disabled={isAnalyzing}
                                onClick={() => {
                                  if (analyzedCase) {
                                    handleSelectStoredCaseInWorkspace(
                                      analyzedCase
                                    );
                                  } else {
                                    handleStartNewCase(presetId);
                                  }
                                }}
                                className={`px-2.5 py-2 text-xs font-mono rounded-lg border transition-colors ${
                                  isCurrent
                                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 font-semibold'
                                    : 'bg-[#080D19] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                }`}
                              >
                                <span>{presetId}</span>
                                {analyzedCase && (
                                  <span className="ml-1 text-[10px] text-cyan-400">
                                    •
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Enterprise Case Management Actions: New Case | Case History | Record Outcome */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLiveDemoOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950/30" />
                    <span>Run Live Learning Demo</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => handleStartNewCase()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Case</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-[#080D19] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Case History ({cases.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenOutcomeForCase(
                        currentAnalysis?.caseId || formData.caseId || 'CB-001',
                        currentAnalysisCaseRecord
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-[#080D19] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                  >
                    <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Record Outcome (
                      {currentAnalysis?.caseId ||
                        formData.caseId.trim() ||
                        'Case'}
                      )
                    </span>
                  </button>
                </div>
              </div>

              {/* Stored Session Cases Switcher Bar (when cases exist in history) */}
              {cases.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] text-slate-400 mr-1">
                    Stored Session Cases:
                  </span>
                  {cases.map((c) => {
                    const isViewing =
                      currentAnalysis?.caseId.toLowerCase() ===
                      c.caseId.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectStoredCaseInWorkspace(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs border transition-colors ${
                          isViewing
                            ? 'bg-teal-500/15 border-teal-500/40 text-teal-200 font-semibold'
                            : 'bg-[#080D19] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span>{c.caseId}</span>
                        <span
                          className={
                            c.decision === 'FIGHT'
                              ? 'text-teal-400'
                              : 'text-amber-400'
                          }
                        >
                          {c.decision}
                        </span>
                        {c.outcomeRecorded ? (
                          <span className="text-[10px] text-cyan-300">
                            [{c.outcome}]
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            [Unrecorded]
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Visual Sequential Precedent Workflow Strip */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Sequential Precedent Workflow
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Unrecorded cases are not treated as historical precedents until retained via{' '}
                    <code className="font-mono text-teal-400">POST /outcome</code>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {SEQUENTIAL_WORKFLOW_STEPS.map((item) => (
                    <div
                      key={item.step}
                      className="bg-[#080D19] border border-slate-800/90 rounded-lg px-3 py-2"
                    >
                      <div className="font-mono text-[10px] text-teal-400 font-bold">
                        STEP {item.step}
                      </div>
                      <div className="text-xs font-semibold text-slate-100 mt-0.5 leading-snug">
                        {item.label}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {item.sublabel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Dispute Intake Form */}
              <div className="lg:col-span-5 space-y-6">
                <CaseForm
                  formData={formData}
                  onChange={setFormData}
                  onSubmit={handleAnalyzeSubmit}
                  isAnalyzing={isAnalyzing}
                  onStartNewCase={() => handleStartNewCase()}
                  onReset={() => {
                    setFormData({
                      ...EMPTY_ANALYZE_INPUT,
                      caseId: formData.caseId || 'CB-001',
                    });
                    clearAnalyzeError();
                  }}
                />
              </div>

              {/* Right Column: Live Analysis Workspace */}
              <div className="lg:col-span-7 space-y-6">
                {/* Backend Unavailable Error Banner */}
                {analyzeError && (
                  <div
                    role="alert"
                    className="bg-rose-950/30 border border-rose-500/50 rounded-xl p-6 space-y-2"
                  >
                    <div className="flex items-center gap-2.5 text-rose-300 font-semibold text-base">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>{analyzeError}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      No fake AI result was generated. Verify your FastAPI server is reachable at{' '}
                      <code className="font-mono text-rose-300">
                        {getApiBaseUrl() || window.location.origin}/analyze
                      </code>
                      .
                    </p>
                  </div>
                )}

                {/* Multi-Stage Real-Time Loading State */}
                {isAnalyzing && (
                  <div className="bg-[#0C1322] border border-teal-500/30 rounded-xl p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 text-teal-400 animate-spin shrink-0" />
                      <div>
                        <h3 className="text-base font-semibold text-slate-100">
                          {ANALYSIS_LOADING_STAGES[analysisStageIndex]}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Querying connected FastAPI &amp; Hindsight memory engine for Case{' '}
                          <span className="font-mono text-slate-200">
                            {formData.caseId || 'Dispute'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      {ANALYSIS_LOADING_STAGES.map((stageText, idx) => {
                        const isDone = idx < analysisStageIndex;
                        const isCurrent = idx === analysisStageIndex;
                        return (
                          <div
                            key={stageText}
                            className={`flex items-center gap-2.5 text-xs font-mono ${
                              isCurrent
                                ? 'text-teal-300 font-semibold'
                                : isDone
                                ? 'text-slate-300'
                                : 'text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isCurrent
                                  ? 'bg-teal-400 animate-pulse'
                                  : isDone
                                  ? 'bg-teal-500'
                                  : 'bg-slate-700'
                              }`}
                            />
                            <span>{stageText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live Analysis Result Cards */}
                {!isAnalyzing && currentAnalysis && (
                  <>
                    {/* Next-Step Precedent Action Callout */}
                    <div className="bg-[#08151D] border border-teal-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-mono font-semibold text-teal-300">
                          {currentAnalysisCaseRecord?.outcomeRecorded
                            ? `Case ${currentAnalysis.caseId} outcome (${currentAnalysisCaseRecord.outcome}) is retained in Hindsight`
                            : `Next Step in Precedent Workflow for ${currentAnalysis.caseId}`}
                        </div>
                        <p className="text-slate-300">
                          {currentAnalysisCaseRecord?.outcomeRecorded
                            ? 'Start a new case (e.g. CB-002) to recall this retained precedent during live analysis.'
                            : `Case ${currentAnalysis.caseId} is currently an active analysis and not yet a historical precedent. Record its actual outcome to retain a lesson in Hindsight, or start a new case.`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!currentAnalysisCaseRecord?.outcomeRecorded && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenOutcomeForCase(
                                currentAnalysis.caseId,
                                currentAnalysisCaseRecord
                              )
                            }
                            className="px-3 py-1.5 font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                          >
                            Record Outcome ({currentAnalysis.caseId})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartNewCase()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            Start{' '}
                            {computeNextCaseId(
                              currentAnalysis.caseId,
                              cases.map((c) => c.caseId)
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 1. Executive Decision Banner */}
                    <DecisionCard
                      analysis={currentAnalysis}
                      disputeAmount={currentDisputeAmount}
                      outcomeRecorded={
                        currentAnalysisCaseRecord?.outcomeRecorded
                      }
                      recordedOutcomeValue={currentAnalysisCaseRecord?.outcome}
                      onOpenOutcomeForm={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                      onStartNewCase={() => handleStartNewCase()}
                    />

                    {/* 2. Core Precedent Provenance: Learning From Previous Outcomes */}
                    <LearningFromOutcomesSection
                      analysis={currentAnalysis}
                      currentCaseRecord={currentAnalysisCaseRecord}
                      currentRecordedOutcome={currentAnalysisRecordedOutcome}
                      previousCaseRecord={currentAnalysisPreviousCaseRecord}
                      onOpenRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                      onViewLearningChain={() => {
                        setLearningChainFocusCaseId(
                          currentAnalysis.caseId || 'CB-001'
                        );
                        setActiveTab('learning-chain');
                      }}
                    />

                    {/* 3. Memory Impact Card (WITHOUT HINDSIGHT vs WITH HINDSIGHT) */}
                    <MemoryImpactCard analysis={currentAnalysis} />

                    {/* 3. Decision Audit Trail (Complete Provenance Chain) */}
                    <DecisionAuditTrail
                      analysis={currentAnalysis}
                      recordedOutcome={currentAnalysisRecordedOutcome}
                      caseRecord={currentAnalysisCaseRecord}
                      onRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                    />

                    {/* 4. Evidence Intelligence Card */}
                    <EvidenceList analysis={currentAnalysis} />

                    {/* 5. Hindsight Precedents Section (Consolidated by Case ID + Expandable Raw Memories) */}
                    <HindsightPrecedentsSection
                      analysis={currentAnalysis}
                      onRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, currentAnalysisCaseRecord)
                      }
                    />
                  </>
                )}

                {/* Empty Workspace State when starting a new case or before first analysis */}
                {!isAnalyzing && !currentAnalysis && !analyzeError && (
                  <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
                      <FileSearch className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h3 className="text-base font-semibold text-slate-100">
                        Ready to Analyze Case{' '}
                        <span className="font-mono text-teal-400">
                          {formData.caseId.trim() || 'New Case'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Submit the dispute details on the left to call{' '}
                        <code className="font-mono text-teal-400">
                          POST /analyze
                        </code>{' '}
                        with{' '}
                        <code className="font-mono text-slate-200">
                          case_id: &quot;{formData.caseId.trim() || 'CB-001'}&quot;
                        </code>
                        . Previous cases remain saved in{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('history')}
                          className="text-teal-400 hover:underline font-medium"
                        >
                          Case History ({cases.length})
                        </button>
                        .
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW 3: CASE HISTORY ==================== */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-teal-400 mb-1">
                  Session Ledger &amp; Case Inspector
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Case History
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Real cases analyzed during this session with Case ID, dispute type, amount, recommendation, recorded outcome, timestamp, and <code className="font-mono text-teal-400">memory_used</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setLearningChainFocusCaseId('CB-001');
                    setActiveTab('learning-chain');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors whitespace-nowrap"
                  title="Open the Precedent Learning Chain (CB-001 → CB-002)"
                >
                  <GitMerge className="w-3.5 h-3.5 text-teal-400" />
                  <span>Learning Chain (CB-001 → CB-002)</span>
                </button>
                <button
                  type="button"
                  onClick={syncDemoToHindsight}
                  disabled={isSyncingDemoToHindsight}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/35 rounded-lg transition-colors disabled:opacity-50"
                  title="Populates Hindsight vector memory by submitting outcomes for all 10 demonstration cases via POST /outcome"
                >
                  {isSyncingDemoToHindsight ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300" />
                      <span>Seeding Hindsight...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span>
                        Seed Demo into Hindsight ({syncedDemoCaseIds.length}/10)
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartNewCase()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Case</span>
                </button>
                {cases.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-[#0C1322] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Controlled Synthetic Demonstration Precedent Banner */}
            <div className="bg-[#0C1322] border border-violet-900/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Historical Demonstration Case Library
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded">
                      10 Synthetic Scenarios
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                    Controlled synthetic business cases inspired by common real-world chargeback scenarios (Subscription, Product Delivery, Fraud, Duplicate Processing, Digital Services). These demonstrate how Hindsight persistent memory links recurring precedents (e.g., <span className="font-mono text-slate-300">DEMO-CB-001</span> → <span className="font-mono text-slate-300">DEMO-CB-002</span> → <span className="font-mono text-slate-300">DEMO-CB-009</span> → <span className="font-mono text-slate-300">DEMO-CB-010</span>) to identify recurring evidence gaps and alter decisions. No real merchant or customer data is used.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setHistoryScopeFilter('DEMO')}
                  className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                    historyScopeFilter === 'DEMO'
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-200 font-semibold'
                      : 'bg-[#080D19] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  View Demonstration Library (10)
                </button>
              </div>
            </div>

            {/* Filter & Search Bar with Scope Tabs */}
            <div className="space-y-3">
              {/* Scope Tabs: ALL vs LIVE vs DEMO */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-400 mr-1">
                  Scope:
                </span>
                <div className="inline-flex items-center gap-1 p-1 bg-[#0C1322] border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setHistoryScopeFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                      historyScopeFilter === 'ALL'
                        ? 'bg-slate-700 text-slate-100 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Cases ({cases.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryScopeFilter('LIVE')}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                      historyScopeFilter === 'LIVE'
                        ? 'bg-teal-400 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Live Submissions ({cases.filter((c) => !c.isSyntheticDemo).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryScopeFilter('DEMO')}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                      historyScopeFilter === 'DEMO'
                        ? 'bg-violet-400 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Demonstration Library ({cases.filter((c) => Boolean(c.isSyntheticDemo)).length})
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0C1322] p-1 rounded-lg border border-slate-800/80">
                  {(
                    [
                      'ALL',
                      'FIGHT',
                      'FOLD',
                      'WON',
                      'LOST',
                      'UNRECORDED',
                    ] as const
                  ).map((filterValue) => {
                    const active = historyFilter === filterValue;
                    return (
                      <button
                        key={filterValue}
                        type="button"
                        onClick={() => setHistoryFilter(filterValue)}
                        className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                          active
                            ? 'bg-teal-400 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {filterValue}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Specific Filter by Case ID */}
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-teal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={historyCaseIdFilter}
                      onChange={(e) => setHistoryCaseIdFilter(e.target.value)}
                      placeholder="Filter by Case ID (e.g. DEMO-CB-001)"
                      aria-label="Filter by Case ID"
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-[#0C1322] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  {/* General Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search type, claim, evidence..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#0C1322] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Case ID Filter Chips when cases exist */}
            {cases.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono text-[11px] text-slate-400 mr-1">
                  Case IDs:
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryCaseIdFilter('')}
                  className={`px-2.5 py-1 rounded font-mono text-xs border transition-colors ${
                    historyCaseIdFilter === ''
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                      : 'bg-[#0C1322] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({cases.length})
                </button>
                {Array.from(new Set(cases.map((c) => c.caseId))).map((cId) => (
                  <button
                    key={cId}
                    type="button"
                    onClick={() =>
                      setHistoryCaseIdFilter(
                        historyCaseIdFilter === cId ? '' : cId
                      )
                    }
                    className={`px-2.5 py-1 rounded font-mono text-xs border transition-colors ${
                      historyCaseIdFilter.toLowerCase() === cId.toLowerCase()
                        ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                        : 'bg-[#0C1322] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {cId}
                  </button>
                ))}
              </div>
            )}

            <CaseHistoryTable
              cases={filteredCases}
              selectedCaseId={inspectedCase?.id}
              onSelectCase={(item) => setSelectedCaseId(item.id)}
              onRecordOutcome={(item) =>
                handleOpenOutcomeForCase(item.caseId, item)
              }
              onNavigateAnalyze={() => setActiveTab('analyze')}
              onLoadIntoIntake={(item) => handleSelectStoredCaseInWorkspace(item)}
              onViewLearningChain={(item) => {
                setLearningChainFocusCaseId(item.caseId);
                setActiveTab('learning-chain');
              }}
            />

            {/* Detailed Case Inspector */}
            {inspectedCase && (
              <section className="pt-4 space-y-5">
                {/* Synthetic Demonstration Case Disclaimer Banner */}
                {inspectedCase.isSyntheticDemo && (
                  <div className="bg-violet-950/20 border border-violet-800/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-violet-200">
                          Synthetic Demonstration Business Case ({inspectedCase.caseId})
                        </div>
                        <div className="text-[11px] text-violet-300/80">
                          Controlled demonstration precedent inspired by real-world chargeback patterns. Click to populate the Intake form and run a live evaluation against Hindsight.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectStoredCaseInWorkspace(inspectedCase)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-950 bg-violet-300 hover:bg-violet-200 rounded-lg transition-colors shrink-0"
                    >
                      <span>Load into Intake Form</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold text-slate-100">
                        Stored Case Inspector: {inspectedCase.caseId}
                      </h2>
                      {inspectedCase.isSyntheticDemo && (
                        <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-wider text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded">
                          Synthetic Precedent
                        </span>
                      )}
                      {inspectedCase.outcomeRecorded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            Outcome Recorded ({inspectedCase.outcome})
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" />
                          <span>Outcome Not Yet Recorded</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Stored analysis result, Hindsight Memory Impact, and consolidated Hindsight Precedents for{' '}
                      <span className="font-mono text-slate-200">
                        {inspectedCase.caseId}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectStoredCaseInWorkspace(inspectedCase)
                      }
                      className="px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-[#0C1322] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                    >
                      Open in Analyze Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLearningChainFocusCaseId(inspectedCase.caseId);
                        setActiveTab('learning-chain');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>View Learning Chain</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenOutcomeForCase(
                          inspectedCase.caseId,
                          inspectedCase
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                    >
                      {inspectedCase.outcomeRecorded
                        ? `Update Outcome for ${inspectedCase.caseId}`
                        : `Record Outcome for ${inspectedCase.caseId}`}
                    </button>
                  </div>
                </div>

                {/* Claim, Evidence & Recorded Outcome Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0C1322] border border-slate-800/80 rounded-xl p-5 text-xs">
                  <div className="space-y-1">
                    <span className="font-mono uppercase tracking-wider text-slate-400 block">
                      Customer Claim
                    </span>
                    <p className="text-slate-100 leading-relaxed">
                      {inspectedCase.customerClaim}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono uppercase tracking-wider text-slate-400 block">
                      Merchant Evidence Submitted
                    </span>
                    <p className="text-slate-100 leading-relaxed">
                      {inspectedCase.merchantEvidence}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono uppercase tracking-wider text-slate-400 block">
                      Recorded Outcome &amp; Retained Lesson
                    </span>
                    {inspectedCase.outcomeRecorded ? (
                      <div className="space-y-1">
                        <span
                          className={`font-mono font-bold ${
                            inspectedCase.outcome === 'WON'
                              ? 'text-teal-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {inspectedCase.outcome}
                        </span>
                        {inspectedCase.lessonRetained && (
                          <p className="text-slate-200 leading-relaxed">
                            {inspectedCase.lessonRetained}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 leading-relaxed">
                        Outcome not yet recorded. This case is not stored as a historical outcome precedent until recorded via{' '}
                        <code className="font-mono text-teal-400">
                          POST /outcome
                        </code>
                        .
                      </p>
                    )}
                  </div>
                </div>

                {/* Core Precedent Provenance: Learning From Previous Outcomes */}
                <LearningFromOutcomesSection
                  analysis={inspectedCase.analysis}
                  currentCaseRecord={inspectedCase}
                  currentRecordedOutcome={outcomes.find(
                    (o) =>
                      o.caseId.toLowerCase() ===
                      inspectedCase.caseId.toLowerCase()
                  )}
                  previousCaseRecord={inspectedPreviousCaseRecord}
                  onOpenRecordOutcome={(cId) =>
                    handleOpenOutcomeForCase(cId, inspectedCase)
                  }
                  onViewLearningChain={() => {
                    setLearningChainFocusCaseId(
                      inspectedCase.caseId || 'CB-001'
                    );
                    setActiveTab('learning-chain');
                  }}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6 space-y-5">
                    <DecisionCard
                      analysis={inspectedCase.analysis}
                      disputeAmount={inspectedCase.amount}
                      outcomeRecorded={inspectedCase.outcomeRecorded}
                      recordedOutcomeValue={inspectedCase.outcome}
                      onOpenOutcomeForm={(cId) =>
                        handleOpenOutcomeForCase(cId, inspectedCase)
                      }
                      onStartNewCase={() => handleStartNewCase()}
                    />
                    <DecisionAuditTrail
                      analysis={inspectedCase.analysis}
                      recordedOutcome={outcomes.find(
                        (o) =>
                          o.caseId.toLowerCase() ===
                          inspectedCase.caseId.toLowerCase()
                      )}
                      caseRecord={inspectedCase}
                      onRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, inspectedCase)
                      }
                    />
                    <EvidenceList analysis={inspectedCase.analysis} />
                  </div>
                  <div className="lg:col-span-6 space-y-5">
                    <MemoryImpactCard analysis={inspectedCase.analysis} />
                    <HindsightPrecedentsSection
                      analysis={inspectedCase.analysis}
                      onRecordOutcome={(cId) =>
                        handleOpenOutcomeForCase(cId, inspectedCase)
                      }
                    />
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ==================== VIEW: LEARNING CHAIN ==================== */}
        {activeTab === 'learning-chain' && (
          <LearningChainView
            initialCaseId={learningChainFocusCaseId}
            onLoadIntoIntake={(caseItem) => {
              handleSelectStoredCaseInWorkspace(caseItem);
              setActiveTab('analyze');
            }}
            onRecordOutcome={(caseItem) => {
              handleOpenOutcomeForCase(caseItem.caseId, caseItem);
            }}
            onInspectCase={(caseItem) => {
              setSelectedCaseId(caseItem.id);
              setActiveTab('history');
            }}
            onOpenLiveDemo={() => setLiveDemoOpen(true)}
          />
        )}

        {/* ==================== VIEW 4: MEMORY ==================== */}
        {activeTab === 'memory' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-teal-400 mb-1">
                  Hindsight Persistent Memory Explorer
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Hindsight Precedents
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Consolidated unique precedents grouped by Case ID —{' '}
                  <span className="font-mono text-teal-400 font-semibold">
                    {metrics.uniquePrecedents} unique{' '}
                    {metrics.uniquePrecedents === 1
                      ? 'precedent'
                      : 'precedents'}
                  </span>{' '}
                  derived from{' '}
                  <span className="font-mono text-cyan-400 font-semibold">
                    {metrics.memoriesRecalled} raw recalled memory{' '}
                    {metrics.memoriesRecalled === 1 ? 'entry' : 'entries'}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('outcomes')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors shrink-0"
              >
                <span>Retain New Outcome Lesson</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 bg-[#0C1322] p-1 rounded-lg border border-slate-800/80">
                {(
                  [
                    { id: 'ALL', label: 'All Precedents' },
                    {
                      id: 'RECALLED FROM HINDSIGHT',
                      label: 'Recalled from Hindsight',
                    },
                    {
                      id: 'RETAINED IN HINDSIGHT',
                      label: 'Retained in Hindsight',
                    },
                  ] as const
                ).map((tab) => {
                  const active = memorySourceFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMemorySourceFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        active
                          ? 'bg-teal-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={memorySearch}
                  onChange={(e) => setMemorySearch(e.target.value)}
                  placeholder="Search by Case ID (e.g. CB-001), lesson..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#0C1322] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {groupedExplorerMemories.length === 0 ? (
              <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-10 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-medium text-slate-200">
                    No Hindsight precedents in this session yet
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Consolidated precedents populate here automatically when recalled from Hindsight by{' '}
                    <code className="font-mono text-teal-400">POST /analyze</code>{' '}
                    or when you retain a dispute outcome via{' '}
                    <code className="font-mono text-teal-400">POST /outcome</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedExplorerMemories.map((group) => (
                  <div
                    key={group.sourceCaseId}
                    className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <FolderGit2 className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="font-bold text-slate-100">
                          Precedent Case ID: {group.sourceCaseId}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {group.memories.length} consolidated{' '}
                        {group.memories.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {group.memories.map((mem) => (
                        <MemoryCard
                          key={mem.id}
                          memory={mem}
                          onUseInAnalyzer={handleUseMemoryInAnalyzer}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW 5: OUTCOMES ==================== */}
        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-teal-400 mb-1">
                  Hindsight Memory Retention · POST /outcome
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Record Dispute Outcome
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Retain actual chargeback outcomes (<code className="font-mono text-teal-400">WON</code> or{' '}
                  <code className="font-mono text-rose-400">LOST</code>) and lessons learned in Hindsight via{' '}
                  <code className="font-mono text-teal-400">
                    POST {configuredBaseUrl}/outcome
                  </code>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleStartNewCase()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start Next Case in Analyzer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 Cols: POST /outcome Form */}
              <form
                onSubmit={handleOutcomeSubmit}
                className="lg:col-span-5 bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      Outcome Retention Form
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Converts an analyzed case into a retained Hindsight precedent
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOutcomeForm(OUTCOME_EXAMPLES[0].data);
                      clearOutcomeError();
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                  >
                    Fill CB-001 Template
                  </button>
                </div>

                {outcomeError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs text-rose-200"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{outcomeError}</span>
                  </div>
                )}

                {outcomeRetainedBanner && (
                  <div
                    role="status"
                    className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/40 text-xs text-teal-200 space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold text-teal-300">
                          Outcome retained in Hindsight
                        </div>
                        <p className="leading-relaxed">{outcomeRetainedBanner}</p>
                      </div>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          handleStartNewCase(
                            computeNextCaseId(
                              outcomeForm.caseId,
                              cases.map((c) => c.caseId)
                            )
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          Start{' '}
                          {computeNextCaseId(
                            outcomeForm.caseId,
                            cases.map((c) => c.caseId)
                          )}{' '}
                          to Recall Precedent →
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="outcomeCaseIdInput"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Case ID (<code className="font-mono text-slate-400">case_id</code>)
                    </label>
                    <input
                      id="outcomeCaseIdInput"
                      type="text"
                      required
                      disabled={isSubmittingOutcome}
                      value={outcomeForm.caseId}
                      onChange={(e) =>
                        setOutcomeForm({
                          ...outcomeForm,
                          caseId: e.target.value,
                        })
                      }
                      placeholder="e.g. CB-001"
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="outcomeStatusSelect"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Outcome (<code className="font-mono text-slate-400">outcome</code>)
                    </label>
                    <select
                      id="outcomeStatusSelect"
                      disabled={isSubmittingOutcome}
                      value={outcomeForm.outcome}
                      onChange={(e) =>
                        setOutcomeForm({
                          ...outcomeForm,
                          outcome: e.target.value as 'LOST' | 'WON',
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400"
                    >
                      <option value="LOST">LOST</option>
                      <option value="WON">WON</option>
                    </select>
                  </div>
                </div>

                {cases.length > 0 && (
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1.5">
                      Select from analyzed session cases:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cases.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleOpenOutcomeForCase(c.caseId, c)}
                          className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                            outcomeForm.caseId.toLowerCase() ===
                            c.caseId.toLowerCase()
                              ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                              : 'bg-[#080D19] border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {c.caseId} ({c.decision}
                          {c.outcomeRecorded ? ` · ${c.outcome}` : ''})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="outcomeActualResult"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Actual Result (<code className="font-mono text-slate-400">actual_result</code>)
                  </label>
                  <textarea
                    id="outcomeActualResult"
                    rows={3}
                    required
                    disabled={isSubmittingOutcome}
                    value={outcomeForm.actualResult}
                    onChange={(e) =>
                      setOutcomeForm({
                        ...outcomeForm,
                        actualResult: e.target.value,
                      })
                    }
                    placeholder="Describe what happened in the dispute resolution..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400 leading-relaxed"
                  />
                </div>

                <div>
                  <label
                    htmlFor="outcomeLesson"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Lesson Learned (<code className="font-mono text-slate-400">lesson</code>)
                  </label>
                  <textarea
                    id="outcomeLesson"
                    rows={3}
                    required
                    disabled={isSubmittingOutcome}
                    value={outcomeForm.lesson}
                    onChange={(e) =>
                      setOutcomeForm({
                        ...outcomeForm,
                        lesson: e.target.value,
                      })
                    }
                    placeholder="Specify the precedent lesson to retain in Hindsight for future cases..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingOutcome}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmittingOutcome
                      ? 'Retaining Outcome in Hindsight...'
                      : `Record Outcome for ${outcomeForm.caseId || 'Case'} (POST /outcome)`}
                  </span>
                </button>
              </form>

              {/* Right 7 Cols: Retained Outcomes Ledger */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      Outcomes Retained &amp; Demo Precedents
                    </h2>
                    <span className="text-xs text-slate-400">
                      Dispute outcomes and retained lesson records
                    </span>
                  </div>

                  {/* Scope Filter for Outcomes */}
                  <div className="inline-flex items-center gap-1 p-0.5 bg-[#0C1322] border border-slate-800 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setOutcomesScopeFilter('ALL')}
                      className={`px-2.5 py-1 font-mono rounded ${
                        outcomesScopeFilter === 'ALL'
                          ? 'bg-slate-700 text-slate-100 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({outcomes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcomesScopeFilter('LIVE')}
                      className={`px-2.5 py-1 font-mono rounded ${
                        outcomesScopeFilter === 'LIVE'
                          ? 'bg-teal-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Live ({outcomes.filter((o) => !o.isSyntheticDemo).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcomesScopeFilter('DEMO')}
                      className={`px-2.5 py-1 font-mono rounded ${
                        outcomesScopeFilter === 'DEMO'
                          ? 'bg-violet-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Demo ({outcomes.filter((o) => Boolean(o.isSyntheticDemo)).length})
                    </button>
                  </div>
                </div>

                {outcomes.filter((o) =>
                  outcomesScopeFilter === 'ALL'
                    ? true
                    : outcomesScopeFilter === 'LIVE'
                    ? !o.isSyntheticDemo
                    : Boolean(o.isSyntheticDemo)
                ).length === 0 ? (
                  <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-10 text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
                      <GitPullRequest className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <p className="text-sm font-medium text-slate-200">
                        No dispute outcomes matching selected scope
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Submit the form on the left to send{' '}
                        <code className="font-mono text-teal-400">POST /outcome</code>{' '}
                        and retain a lesson in Hindsight persistent memory.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outcomes
                      .filter((o) =>
                        outcomesScopeFilter === 'ALL'
                          ? true
                          : outcomesScopeFilter === 'LIVE'
                          ? !o.isSyntheticDemo
                          : Boolean(o.isSyntheticDemo)
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-teal-300">
                                {item.caseId}
                              </span>
                              {item.disputeType && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-slate-300">
                                    {item.disputeType}
                                  </span>
                                </>
                              )}
                              <span className="text-slate-600">·</span>
                              <span
                                className={`font-bold ${
                                  item.outcome === 'WON'
                                    ? 'text-teal-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                Outcome: {item.outcome}
                              </span>
                            </div>
                            {item.isSyntheticDemo ? (
                              <span className="font-mono text-[10px] text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded">
                                {syncedDemoCaseIds.includes(item.caseId)
                                  ? 'DEMO SEEDED IN HINDSIGHT'
                                  : 'DEMONSTRATION PRECEDENT'}
                              </span>
                            ) : (
                              <span className="font-mono text-[11px] text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                                RETAINED IN HINDSIGHT
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-300 leading-relaxed">
                            <span className="text-slate-400 font-medium">
                              Actual Result:{' '}
                            </span>
                            {item.actualResult}
                          </div>

                          <div className="bg-[#080D19] border border-slate-800 rounded-lg p-3 text-xs">
                            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-cyan-400 block mb-1">
                              PRECEDENT LESSON
                            </span>
                            <p className="text-slate-100 leading-relaxed">
                              {item.lesson}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW 6: ANALYTICS ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-teal-400 mb-1">
                  Session &amp; Precedent Intelligence
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Dispute Operations Analytics
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  {analyticsScope === 'LIVE'
                    ? 'Computed strictly from live dispute evaluations and outcomes in your active FastAPI session.'
                    : analyticsScope === 'DEMO'
                    ? 'Analytics across the 10 synthetic demonstration scenarios illustrating dispute decision splits and precedent patterns.'
                    : 'Combined analytics of all live session records and demonstration library cases.'}
                </p>
              </div>

              {/* Analytics Scope Toggle */}
              <div className="inline-flex items-center gap-1 p-1 bg-[#0C1322] border border-slate-800 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setAnalyticsScope('LIVE')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                    analyticsScope === 'LIVE'
                      ? 'bg-teal-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Live Session ({cases.filter((c) => !c.isSyntheticDemo).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsScope('DEMO')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                    analyticsScope === 'DEMO'
                      ? 'bg-violet-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Demo Library (10)
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsScope('ALL')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                    analyticsScope === 'ALL'
                      ? 'bg-slate-700 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({cases.length})
                </button>
              </div>
            </div>

            {analyticsData.totalCases === 0 && outcomes.length === 0 ? (
              <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-10 text-center space-y-4">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-semibold text-slate-100">
                    No Live Analytics Data Yet
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Precedent does not display fabricated historical charts. Run a dispute analysis on{' '}
                    <strong className="text-slate-200">Analyze Dispute</strong>{' '}
                    to populate live decision distributions, unique precedents vs. raw recalled memories, and dispute type breakdowns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('analyze')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                >
                  <span>Analyze First Dispute</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Disputed Volume Analyzed"
                    value={`$${analyticsData.totalDisputedVolume.toLocaleString(
                      'en-US',
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}`}
                    deltaText={`${analyticsData.totalCases} case(s)`}
                    deltaTone="neutral"
                    subtext="Cumulative USD value of disputes analyzed in this session"
                  />
                  <StatCard
                    label="Unique Precedents"
                    value={metrics.uniquePrecedents}
                    deltaText={`from ${metrics.memoriesRecalled} raw memories`}
                    deltaTone="positive"
                    subtext="Dynamically consolidated unique Case IDs from Hindsight"
                  />
                  <StatCard
                    label="Memory-Guided Decisions"
                    value={analyticsData.memoryGuidedCount}
                    deltaText={`${
                      analyticsData.totalCases > 0
                        ? Math.round(
                            (analyticsData.memoryGuidedCount /
                              analyticsData.totalCases) *
                              100
                          )
                        : 0
                    }% of cases`}
                    deltaTone="accent"
                    subtext="Analyses where Hindsight recalled relevant prior lessons"
                  />
                  <StatCard
                    label="Recommendation Shifts"
                    value={analyticsData.baselineTransitions}
                    deltaText="Baseline → Hindsight"
                    deltaTone="positive"
                    subtext="Cases where recalled memory flipped FIGHT ↔ FOLD"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Decision Split & Outcome Split */}
                  <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
                    <h3 className="text-base font-semibold text-slate-100 border-b border-slate-800/80 pb-3">
                      Decision &amp; Recorded Outcome Distribution
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4">
                        <span className="text-xs text-slate-400 block">
                          FIGHT Recommendations
                        </span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-teal-400 tabular-nums">
                          {analyticsData.fightCount}
                        </span>
                      </div>
                      <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4">
                        <span className="text-xs text-slate-400 block">
                          FOLD Recommendations
                        </span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-amber-400 tabular-nums">
                          {analyticsData.foldCount}
                        </span>
                      </div>
                      <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4">
                        <span className="text-xs text-slate-400 block">
                          Recorded Outcomes WON
                        </span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-teal-400 tabular-nums">
                          {analyticsData.wonCount}
                        </span>
                      </div>
                      <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4">
                        <span className="text-xs text-slate-400 block">
                          Recorded Outcomes LOST
                        </span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-rose-400 tabular-nums">
                          {analyticsData.lostCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown by Dispute Type */}
                  <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-4">
                    <h3 className="text-base font-semibold text-slate-100 border-b border-slate-800/80 pb-3">
                      Breakdown by Dispute Type
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.byDisputeType.map(([type, stats]) => (
                        <div
                          key={type}
                          className="bg-[#080D19] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-100">
                              {type}
                            </div>
                            <div className="text-slate-400 mt-0.5">
                              {stats.count} case(s) analyzed · {stats.memoryUsed}{' '}
                              memory-guided
                            </div>
                          </div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-teal-400">
                              FIGHT: {stats.fight}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-amber-400">
                              FOLD: {stats.fold}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Live Proof of Learning Modal */}
        <LiveLearningDemoModal
          isOpen={liveDemoOpen}
          onClose={() => setLiveDemoOpen(false)}
          cases={cases}
          outcomes={outcomes}
          onOutcomeRetained={(retainedOutcome) => {
            registerRetainedOutcome(retainedOutcome);
            refreshConnectionStatus();
          }}
          onCaseAnalyzed={(analyzedCaseResult) => {
            registerAnalyzedCase(analyzedCaseResult, 129.99);
            refreshConnectionStatus();
          }}
          onOpenOutcomeForm={(cId) => handleOpenOutcomeForCase(cId)}
        />
      </main>
      </div>
    </div>
  );
}
