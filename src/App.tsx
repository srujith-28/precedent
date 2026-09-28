import React, { useMemo, useState } from 'react';
import {
  CaseAnalysisResult,
  CaseFormInput,
  ChargebackCase,
  MemoryEntry,
  NavigationTab,
  OutcomeFormInput,
} from './types/precedent';
import {
  DEFAULT_ANALYZE_INPUT,
  DEFAULT_OUTCOME_INPUT,
  INITIAL_CASES,
  INITIAL_MEMORIES,
} from './data/demoData';
import {
  analyzeCaseWithPrecedent,
  getApiBaseUrl,
  submitOutcomeToPrecedent,
} from './services/api';
import { Navigation } from './components/Navigation';
import { StatCard } from './components/StatCard';
import { CaseForm } from './components/CaseForm';
import { DecisionCard } from './components/DecisionCard';
import { EvidenceList } from './components/EvidenceList';
import { MemoryCard } from './components/MemoryCard';
import { CaseHistoryTable } from './components/CaseHistoryTable';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Search,
  Send,
} from 'lucide-react';

const HINDSIGHT_FLOW_NODES = [
  {
    title: 'CASE',
    subtitle: 'CB-001 ($89.99) & CB-002 ($129.99)',
    description:
      'Subscription dispute: "Customer claims cancellation before renewal."',
  },
  {
    title: 'HINDSIGHT RECALL',
    subtitle: 'POST /analyze',
    description:
      'Queries persistent Hindsight memory for prior Subscription dispute outcomes.',
  },
  {
    title: 'AI DECISION',
    subtitle: 'recommendation, confidence, evidence_to_submit',
    description:
      'Produces FIGHT or FOLD recommendation and evidence influenced by recalled memories.',
  },
  {
    title: 'OUTCOME',
    subtitle: 'WON or LOST',
    description:
      'CB-001 Outcome: LOST because only generic receipt and account activity were submitted.',
  },
  {
    title: 'HINDSIGHT RETAIN',
    subtitle: 'POST /outcome',
    description:
      'Retains lesson: "The merchant lost because cancellation records and customer communication were missing."',
  },
  {
    title: 'FUTURE IMPROVEMENT',
    subtitle: 'Applied to CB-002',
    description:
      'When CB-002 ($129.99) is analyzed, Hindsight recalls CB-001 and requires cancellation records & customer communication.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [cases, setCases] = useState<ChargebackCase[]>(INITIAL_CASES);
  const [memories, setMemories] = useState<MemoryEntry[]>(INITIAL_MEMORIES);

  // Actual backend telemetry counters (0 initially, incremented only by real FastAPI responses)
  const [liveStats, setLiveStats] = useState({
    casesAnalyzed: 0,
    memoriesRecalled: 0,
    outcomesLearned: 0,
    casesImproved: 0,
  });

  // Analyze Case State (POST /analyze)
  const [formData, setFormData] = useState<CaseFormInput>(DEFAULT_ANALYZE_INPUT);
  const [liveAnalysis, setLiveAnalysis] = useState<CaseAnalysisResult | null>(
    null
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Record Outcome State (POST /outcome)
  const [outcomeForm, setOutcomeForm] = useState<OutcomeFormInput>(
    DEFAULT_OUTCOME_INPUT
  );
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [outcomeSuccess, setOutcomeSuccess] = useState<string | null>(null);

  // Case History State
  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | 'FIGHT' | 'FOLD' | 'WON' | 'LOST'
  >('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [inspectedCase, setInspectedCase] = useState<ChargebackCase | null>(
    INITIAL_CASES[1]
  );

  // Memory Search State
  const [memorySearch, setMemorySearch] = useState('');

  // Execute POST ${VITE_API_BASE_URL}/analyze
  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const result = await analyzeCaseWithPrecedent(formData);
      setLiveAnalysis(result);

      // Update live backend counters from actual FastAPI response
      setLiveStats((prev) => ({
        casesAnalyzed: prev.casesAnalyzed + 1,
        memoriesRecalled:
          prev.memoriesRecalled + result.recalled_memories.length,
        outcomesLearned: prev.outcomesLearned,
        casesImproved:
          prev.casesImproved + (result.memory_used ? 1 : 0),
      }));

      const newCase: ChargebackCase = {
        id: `live-case-${Date.now()}`,
        caseId: result.caseId,
        disputeType: formData.disputeType,
        amount: parseFloat(formData.amount) || 0,
        customerClaim: formData.customerClaim,
        merchantEvidence: formData.merchantEvidence,
        decision: result.decision,
        confidence: result.confidence,
        outcome: result.decision === 'FOLD' ? 'FOLDED' : 'PENDING',
        submittedAt: result.analyzedAt,
        analysis: result,
        isDemo: false,
      };

      setCases((prev) => [newCase, ...prev]);
      setInspectedCase(newCase);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Backend unavailable — connect FastAPI to run live analysis.';
      setAnalyzeError(message);
      setLiveAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Execute POST ${VITE_API_BASE_URL}/outcome
  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOutcome(true);
    setOutcomeError(null);
    setOutcomeSuccess(null);

    try {
      const matchedCase = cases.find((c) => c.caseId === outcomeForm.caseId);
      const disputeType =
        matchedCase?.disputeType || formData.disputeType || 'Subscription';

      const response = await submitOutcomeToPrecedent(outcomeForm, disputeType);

      setMemories((prev) => [response.memory_entry, ...prev]);
      setLiveStats((prev) => ({
        ...prev,
        outcomesLearned: prev.outcomesLearned + 1,
      }));

      setCases((prev) =>
        prev.map((c) =>
          c.caseId === outcomeForm.caseId
            ? {
                ...c,
                outcome: outcomeForm.outcome,
                actualResult: outcomeForm.actualResult,
                lessonRetained: outcomeForm.lesson,
              }
            : c
        )
      );

      setOutcomeSuccess(
        `POST /outcome succeeded: Retained outcome (${outcomeForm.outcome}) and lesson for ${outcomeForm.caseId} in Hindsight.`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Backend unavailable — connect FastAPI to run live analysis.';
      setOutcomeError(message);
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const handleApplyMemoryToAnalyzer = (memory: MemoryEntry) => {
    setFormData({
      caseId: 'CB-002',
      disputeType: memory.disputeType || 'Subscription',
      amount: '129.99',
      customerClaim: 'Customer claims cancellation before renewal.',
      merchantEvidence: 'transaction receipt and account activity.',
    });
    setAnalyzeError(null);
    setActiveTab('analyze');
  };

  const handleExportCsv = () => {
    const headers = [
      'Case ID',
      'Source',
      'Dispute Type',
      'Amount USD',
      'Decision',
      'Confidence %',
      'Memory Used',
      'Outcome',
    ];
    const rows = cases.map((c) => [
      c.caseId,
      c.isDemo ? 'DEMO' : 'LIVE_FASTAPI',
      `"${c.disputeType.replace(/"/g, '""')}"`,
      c.amount.toFixed(2),
      c.decision,
      c.confidence,
      c.analysis.memory_used ? 'true' : 'false',
      c.outcome,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'precedent_cases.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesFilter =
        historyFilter === 'ALL'
          ? true
          : historyFilter === 'FIGHT' || historyFilter === 'FOLD'
          ? c.decision === historyFilter
          : c.outcome === historyFilter;

      const q = historySearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        c.disputeType.toLowerCase().includes(q) ||
        c.customerClaim.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [cases, historyFilter, historySearch]);

  const filteredMemories = useMemo(() => {
    const q = memorySearch.trim().toLowerCase();
    return memories.filter(
      (m) =>
        !q ||
        m.memoryCode.toLowerCase().includes(q) ||
        m.patternTitle.toLowerCase().includes(q) ||
        m.disputeType.toLowerCase().includes(q) ||
        m.lesson.toLowerCase().includes(q)
    );
  }, [memories, memorySearch]);

  const configuredBaseUrl = getApiBaseUrl() || '(relative / same-origin)';
  const demoCaseCB002 = INITIAL_CASES[1];

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickAnalyze={() => setActiveTab('analyze')}
        onExportCsv={handleExportCsv}
      />

      <main className="flex-1 mx-auto w-full max-w-[1440px] px-6 py-8">
        {/* ==================== VIEW 1: DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-teal-400 mb-1">
                  <span>Hindsight Persistent Dispute Memory</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  PRECEDENT — Chargeback Intelligence
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  AI chargeback analyst that learns from previous dispute outcomes using Hindsight persistent memory (<code className="font-mono text-teal-400">POST /analyze</code> &amp; <code className="font-mono text-teal-400">POST /outcome</code>).
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('memory')}
                  className="px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white bg-[#0C1322] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  View Memory
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('analyze')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Analyze Case</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4 Dashboard Cards: Actual backend values (0 initially until FastAPI calls return) */}
            <section
              aria-label="Hindsight Live Telemetry"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <StatCard
                label="Cases Analyzed"
                value={String(liveStats.casesAnalyzed)}
                deltaText="POST /analyze"
                deltaTone="positive"
                subtext="Live cases analyzed by the connected FastAPI backend"
                onClick={() => setActiveTab('analyze')}
              />
              <StatCard
                label="Memories Recalled"
                value={String(liveStats.memoriesRecalled)}
                deltaText="Hindsight Recall"
                deltaTone="accent"
                subtext="Memories returned by FastAPI during live case analysis"
                onClick={() => setActiveTab('memory')}
              />
              <StatCard
                label="Outcomes Learned"
                value={String(liveStats.outcomesLearned)}
                deltaText="POST /outcome"
                deltaTone="positive"
                subtext="Dispute outcomes retained into Hindsight via FastAPI"
                onClick={() => setActiveTab('analyze')}
              />
              <StatCard
                label="Cases Improved by Memory"
                value={String(liveStats.casesImproved)}
                deltaText="memory_used = true"
                deltaTone="positive"
                subtext="Live analyses where recalled Hindsight memory guided strategy"
                onClick={() => setActiveTab('history')}
              />
            </section>

            {/* Central Hindsight Demo: Vertical & Step-by-Step Flow + CB-001 -> CB-002 */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 Cols: Explicit Vertical Flow CASE ↓ HINDSIGHT RECALL ↓ AI DECISION ↓ OUTCOME ↓ HINDSIGHT RETAIN ↓ FUTURE IMPROVEMENT */}
              <div className="lg:col-span-5 bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      Hindsight Memory Loop
                    </h2>
                    <p className="text-xs text-slate-400">
                      Persistent learning across chargeback cases
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Demo Flow
                  </span>
                </div>

                <div className="flex flex-col items-center space-y-2">
                  {HINDSIGHT_FLOW_NODES.map((node, idx) => (
                    <React.Fragment key={node.title}>
                      <div className="w-full bg-[#080D19] border border-slate-800/90 rounded-lg p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold tracking-wider text-teal-400">
                            {node.title}
                          </span>
                          <span className="font-mono text-[11px] text-cyan-400">
                            {node.subtitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {node.description}
                        </p>
                      </div>
                      {idx < HINDSIGHT_FLOW_NODES.length - 1 && (
                        <ArrowDown className="w-4 h-4 text-teal-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Right 7 Cols: CB-001 & CB-002 Hindsight Demo Comparison */}
              <div className="lg:col-span-7 bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-100">
                        Hindsight Demo: CB-001 → CB-002
                      </h2>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Demo
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      How retaining the LOST outcome on CB-001 improves recommended evidence when CB-002 is analyzed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(DEFAULT_ANALYZE_INPUT);
                      setActiveTab('analyze');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Analyze CB-002 Live →
                  </button>
                </div>

                {/* CB-001 Card */}
                <div className="bg-[#080D19] border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-slate-100">CB-001</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300">Subscription</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-100 font-semibold">$89.99</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-rose-400">
                      Outcome: LOST
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Customer claim:</span>
                      <span className="text-slate-200">
                        Customer claims cancellation before renewal.
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Merchant evidence:</span>
                      <span className="text-slate-200">
                        generic transaction receipt and account activity.
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-xs">
                    <span className="font-mono text-cyan-400 font-semibold">
                      Hindsight Retain Lesson:{' '}
                    </span>
                    <span className="text-slate-100 italic">
                      &ldquo;The merchant lost because cancellation records and customer communication were missing.&rdquo;
                    </span>
                  </div>
                </div>

                {/* CB-002 Card */}
                <div className="bg-[#080D19] border border-teal-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-teal-400">CB-002</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300">Subscription</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-100 font-semibold">$129.99</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-cyan-400">
                      Hindsight Recalls CB-001
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Customer claim:</span>
                      <span className="text-slate-200">
                        Customer claims cancellation before renewal.
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Merchant evidence:</span>
                      <span className="text-slate-200">
                        transaction receipt and account activity.
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0C1322] border border-cyan-500/30 rounded-lg p-3 space-y-1.5 text-xs">
                    <div className="font-semibold text-teal-300">
                      How Recalled CB-001 Memory Influenced CB-002 Recommended Evidence:
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      When <strong className="font-mono text-slate-100">CB-002</strong> is analyzed, Hindsight recalls the <strong className="font-mono text-slate-100">CB-001</strong> lesson (<em>&ldquo;The merchant lost because cancellation records and customer communication were missing.&rdquo;</em>). Because CB-002 only includes a transaction receipt and account activity, the recalled memory directly updates <code className="font-mono text-teal-300">evidence_to_submit</code> to require <strong>cancellation records</strong> and <strong>customer communication</strong> before fighting.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Cases Table */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-100">
                    Demo &amp; Session Cases
                  </h2>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Demo Labeled
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Open Case History →
                </button>
              </div>

              <CaseHistoryTable
                cases={cases}
                selectedCaseId={inspectedCase?.caseId}
                onSelectCase={(item) => {
                  setInspectedCase(item);
                  setActiveTab('history');
                }}
                onOpenOutcomeModal={(item) => {
                  setOutcomeForm({
                    caseId: item.caseId,
                    outcome: item.outcome === 'WON' ? 'WON' : 'LOST',
                    actualResult:
                      item.actualResult ||
                      'Merchant submitted generic transaction receipt and account activity.',
                    lesson:
                      item.lessonRetained ||
                      'The merchant lost because cancellation records and customer communication were missing.',
                  });
                  setActiveTab('analyze');
                }}
              />
            </section>
          </div>
        )}

        {/* ==================== VIEW 2: ANALYZE CASE ==================== */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="text-xs font-medium text-teal-400 mb-1">
                  FastAPI Integration: POST /analyze &amp; POST /outcome
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Analyze Case with Precedent
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Calls <code className="font-mono text-teal-400">POST {configuredBaseUrl}/analyze</code> and <code className="font-mono text-teal-400">POST {configuredBaseUrl}/outcome</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: POST /analyze + POST /outcome forms */}
              <div className="lg:col-span-5 space-y-6">
                <CaseForm
                  formData={formData}
                  onChange={setFormData}
                  onSubmit={handleAnalyzeSubmit}
                  isAnalyzing={isAnalyzing}
                  onReset={() => {
                    setFormData(DEFAULT_ANALYZE_INPUT);
                    setAnalyzeError(null);
                  }}
                />

                {/* POST /outcome Form */}
                <form
                  onSubmit={handleOutcomeSubmit}
                  className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-4"
                >
                  <div className="border-b border-slate-800/80 pb-3">
                    <h2 className="text-base font-semibold text-slate-100">
                      2. Record Outcome (POST /outcome)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sends <code className="font-mono text-teal-400">case_id</code>, <code className="font-mono text-teal-400">outcome</code>, <code className="font-mono text-teal-400">actual_result</code>, and <code className="font-mono text-teal-400">lesson</code> to Hindsight.
                    </p>
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

                  {outcomeSuccess && (
                    <div
                      role="status"
                      className="flex items-start gap-2.5 p-3.5 rounded-lg bg-teal-500/10 border border-teal-500/40 text-xs text-teal-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>{outcomeSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="outcomeCaseId"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Case ID (<code className="font-mono text-slate-400">case_id</code>)
                      </label>
                      <input
                        id="outcomeCaseId"
                        type="text"
                        required
                        value={outcomeForm.caseId}
                        onChange={(e) =>
                          setOutcomeForm({
                            ...outcomeForm,
                            caseId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-mono bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="outcomeValue"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Outcome (<code className="font-mono text-slate-400">outcome</code>)
                      </label>
                      <select
                        id="outcomeValue"
                        value={outcomeForm.outcome}
                        onChange={(e) =>
                          setOutcomeForm({
                            ...outcomeForm,
                            outcome: e.target.value as 'LOST' | 'WON',
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-mono bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400"
                      >
                        <option value="LOST">LOST</option>
                        <option value="WON">WON</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="actualResult"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Actual Result (<code className="font-mono text-slate-400">actual_result</code>)
                    </label>
                    <textarea
                      id="actualResult"
                      rows={2}
                      required
                      value={outcomeForm.actualResult}
                      onChange={(e) =>
                        setOutcomeForm({
                          ...outcomeForm,
                          actualResult: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lessonInput"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Lesson (<code className="font-mono text-slate-400">lesson</code>)
                    </label>
                    <textarea
                      id="lessonInput"
                      rows={2}
                      required
                      value={outcomeForm.lesson}
                      onChange={(e) =>
                        setOutcomeForm({
                          ...outcomeForm,
                          lesson: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400 leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingOutcome}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmittingOutcome
                        ? 'Calling POST /outcome...'
                        : 'Submit Outcome to Hindsight (POST /outcome)'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Right Column: Live FastAPI Response OR Backend Unavailable Error + Demo Reference */}
              <div className="lg:col-span-7 space-y-6">
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
                      No fake AI result was generated. Connect your FastAPI server at{' '}
                      <code className="font-mono text-rose-300">
                        {getApiBaseUrl() || window.location.origin}/analyze
                      </code>{' '}
                      to run live analysis.
                    </p>
                  </div>
                )}

                {liveAnalysis ? (
                  <>
                    <DecisionCard
                      analysis={liveAnalysis}
                      disputeAmount={parseFloat(formData.amount) || 0}
                      onOpenOutcomeForm={(cId) =>
                        setOutcomeForm((prev) => ({ ...prev, caseId: cId }))
                      }
                    />

                    <EvidenceList
                      items={liveAnalysis.recommendedEvidence}
                      isDemo={false}
                    />

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-base font-semibold text-slate-100">
                          Hindsight Memory Used (<code className="font-mono text-sm text-teal-400">memory_used: {String(liveAnalysis.memory_used)}</code>)
                        </h3>
                        <span className="text-xs font-mono text-slate-400 tabular-nums">
                          {liveAnalysis.hindsightMemoryUsed.length} recalled
                        </span>
                      </div>
                      {liveAnalysis.hindsightMemoryUsed.map((mem) => (
                        <MemoryCard key={mem.id} memory={mem} />
                      ))}
                    </div>
                  </>
                ) : (
                  /* Clearly labeled Demo Reference of CB-002 recalling CB-001 when no live response is active */
                  <div className="space-y-5">
                    <div className="bg-[#0C1322] border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold text-amber-300 mr-2">
                          [Demo Walkthrough Preview: CB-002 Recalling CB-001]
                        </span>
                        Click <strong>Analyze with Precedent</strong> to run a live <code className="font-mono text-teal-400">POST /analyze</code> request against FastAPI.
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        Demo
                      </span>
                    </div>

                    <DecisionCard
                      analysis={demoCaseCB002.analysis}
                      disputeAmount={demoCaseCB002.amount}
                    />

                    <EvidenceList
                      items={demoCaseCB002.analysis.recommendedEvidence}
                      isDemo={true}
                    />

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-base font-semibold text-slate-100">
                          Hindsight Memory Used (Recalled CB-001 Outcome)
                        </h3>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Demo
                        </span>
                      </div>
                      {demoCaseCB002.analysis.hindsightMemoryUsed.map((mem) => (
                        <MemoryCard key={mem.id} memory={mem} />
                      ))}
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
                <div className="flex items-center gap-2 text-xs font-medium text-teal-400 mb-1">
                  <span>Dispute Ledger (CB-001 &amp; CB-002 Hindsight Demo + Live Session Cases)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Case History
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search Case ID..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#0C1322] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#0C1322] border border-slate-800/90 rounded-lg">
                  {(['ALL', 'FIGHT', 'FOLD', 'WON', 'LOST'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setHistoryFilter(f)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        historyFilter === f
                          ? 'bg-teal-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <CaseHistoryTable
              cases={filteredCases}
              selectedCaseId={inspectedCase?.caseId}
              onSelectCase={(c) => setInspectedCase(c)}
              onOpenOutcomeModal={(item) => {
                setOutcomeForm({
                  caseId: item.caseId,
                  outcome: item.outcome === 'WON' ? 'WON' : 'LOST',
                  actualResult:
                    item.actualResult ||
                    'Merchant submitted generic transaction receipt and account activity.',
                  lesson:
                    item.lessonRetained ||
                    'The merchant lost because cancellation records and customer communication were missing.',
                });
                setActiveTab('analyze');
              }}
            />

            {inspectedCase && (
              <div className="pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <span>Case Inspector</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-teal-400 tabular-nums">
                      {inspectedCase.caseId}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <DecisionCard
                      analysis={inspectedCase.analysis}
                      disputeAmount={inspectedCase.amount}
                    />
                  </div>
                  <div className="lg:col-span-5 space-y-4">
                    <EvidenceList
                      items={inspectedCase.analysis.recommendedEvidence}
                      isDemo={inspectedCase.isDemo}
                    />
                    {inspectedCase.analysis.hindsightMemoryUsed.map((m) => (
                      <MemoryCard
                        key={m.id}
                        memory={m}
                        compact
                        onApplyToAnalyzer={handleApplyMemoryToAnalyzer}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW 4: MEMORY ==================== */}
        {activeTab === 'memory' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-teal-400 mb-1">
                  <span>Hindsight Persistent Memory</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  Hindsight Memory
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Lessons retained via <code className="font-mono text-teal-400">POST /outcome</code> and recalled during <code className="font-mono text-teal-400">POST /analyze</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Search CB-001, lesson..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#0C1322] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredMemories.map((mem) => (
                <MemoryCard
                  key={mem.id}
                  memory={mem}
                  onApplyToAnalyzer={handleApplyMemoryToAnalyzer}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
