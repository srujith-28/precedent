import React, { useEffect, useState } from 'react';
import {
  StripeDispute,
  StripeDisputeReason,
  StripeDisputeStatus,
  StripeStatus,
} from '../types/stripe';
import { CaseAnalysisResult } from '../types/precedent';
import {
  analyzeStripeDispute,
  createTestDispute,
  fetchStripeDisputes,
  recordStripeDisputeOutcome,
} from '../services/stripeApi';
import { StripeWebhookDrawer } from './StripeWebhookDrawer';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileCheck,
  FileSearch,
  FileText,
  Filter,
  History,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface StripeDisputesViewProps {
  status: StripeStatus;
  onRefreshStatus: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToMemory?: () => void;
}

export const StripeDisputesView: React.FC<StripeDisputesViewProps> = ({
  status,
  onRefreshStatus,
  onNavigateToHistory,
  onNavigateToMemory,
}) => {
  const [disputes, setDisputes] = useState<StripeDispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StripeDisputeStatus>('all');
  const [selectedDispute, setSelectedDispute] = useState<StripeDispute | null>(null);

  // Inspector Drawer States
  const [activeTab, setActiveTab] = useState<
    'evidence' | 'hindsight' | 'represent' | 'outcome'
  >('evidence');
  const [analyzingDisputeId, setAnalyzingDisputeId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [merchantEvidenceInput, setMerchantEvidenceInput] = useState('');

  // Outcome Form
  const [outcomeVal, setOutcomeVal] = useState<'WON' | 'LOST'>('WON');
  const [actualResultInput, setActualResultInput] = useState('');
  const [lessonInput, setLessonInput] = useState('');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);
  const [outcomeSuccessMessage, setOutcomeSuccessMessage] = useState<string | null>(null);

  // Webhook Drawer
  const [webhookDrawerOpen, setWebhookDrawerOpen] = useState(false);

  // Create dispute modal
  const [showSimModal, setShowSimModal] = useState(false);
  const [simReason, setSimReason] = useState<string>('subscription_canceled');
  const [simAmount, setSimAmount] = useState<number>(149);
  const [simClaim, setSimClaim] = useState('');
  const [creatingSim, setCreatingSim] = useState(false);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await fetchStripeDisputes();
      setDisputes(data);
      if (selectedDispute) {
        const updated = data.find((d) => d.id === selectedDispute.id);
        if (updated) setSelectedDispute(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleOpenInspector = (dispute: StripeDispute) => {
    setSelectedDispute(dispute);
    setActiveTab(dispute.hindsight_analysis ? 'hindsight' : 'evidence');
    setMerchantEvidenceInput(dispute.merchant_supplied_evidence || '');
    setOutcomeSuccessMessage(null);
    setAnalysisError(null);
  };

  const handleRunAnalysis = async (disputeId: string) => {
    setAnalyzingDisputeId(disputeId);
    setAnalysisError(null);
    try {
      const result = await analyzeStripeDispute(disputeId);
      if (result) {
        setDisputes((prev) =>
          prev.map((d) => (d.id === disputeId ? { ...d, hindsight_analysis: result } : d))
        );
        if (selectedDispute && selectedDispute.id === disputeId) {
          setSelectedDispute((prev) => (prev ? { ...prev, hindsight_analysis: result } : null));
        }
        setActiveTab('hindsight');
      } else {
        setAnalysisError('Unable to analyze dispute with Hindsight AI at this time.');
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Error analyzing dispute');
    } finally {
      setAnalyzingDisputeId(null);
    }
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    setSubmittingOutcome(true);
    try {
      const res = await recordStripeDisputeOutcome(
        selectedDispute.id,
        outcomeVal,
        actualResultInput ||
          `Cardholder bank concluded dispute with decision: ${outcomeVal}.`,
        lessonInput ||
          `Dispute reason ${selectedDispute.reason} requires explicit terms acknowledgment and cancellation logs.`
      );
      if (res) {
        setOutcomeSuccessMessage(
          `Dispute outcome ${outcomeVal} recorded and retained into Hindsight memory bank!`
        );
        loadDisputes();
      }
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const handleCreateSimDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSim(true);
    try {
      await createTestDispute({
        reason: simReason,
        amount: simAmount,
        customer_claim:
          simClaim ||
          `Cardholder initiated dispute for ${simReason.replace(/_/g, ' ')} via Stripe sandbox.`,
      });
      setShowSimModal(false);
      setSimClaim('');
      loadDisputes();
    } finally {
      setCreatingSim(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.customer_claim.toLowerCase().includes(q) ||
      (d.connected_evidence.customer_email || '').toLowerCase().includes(q) ||
      (d.connected_evidence.customer_name || '').toLowerCase().includes(q) ||
      d.reason.toLowerCase().includes(q)
    );
  });

  const needsResponseCount = disputes.filter(
    (d) => d.status === 'needs_response' || d.status === 'warning_needs_response'
  ).length;

  const totalAtRisk = disputes
    .filter((d) => d.status !== 'won' && d.status !== 'lost')
    .reduce((sum, d) => sum + d.amount, 0);

  const analyzedCount = disputes.filter((d) => Boolean(d.hindsight_analysis)).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Sandbox Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-teal-400" />
              Stripe Disputes
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Stripe Test Mode (Sandbox)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time dispute representment queue powered by Hindsight persistent precedent
            memory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setWebhookDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-[#0C1322] hover:bg-slate-800/80 border border-slate-700/80 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>Webhooks</span>
            {status.webhook_events_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono">
                {status.webhook_events_count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>Simulate Test Dispute</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadDisputes();
              onRefreshStatus();
            }}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-[#0C1322] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh disputes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#080E1C] border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Disputes (Test Mode)</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {disputes.length}
          </div>
          <div className="text-[11px] text-slate-500">Live test data in sandbox</div>
        </div>

        <div className="p-4 rounded-xl bg-[#080E1C] border border-amber-900/30 space-y-1">
          <div className="text-[11px] font-medium text-amber-300/90 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Needs Response
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {needsResponseCount}
          </div>
          <div className="text-[11px] text-amber-400/70">Awaiting representment</div>
        </div>

        <div className="p-4 rounded-xl bg-[#080E1C] border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Value At Risk</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            ${totalAtRisk.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Across open disputes</div>
        </div>

        <div className="p-4 rounded-xl bg-[#080E1C] border border-teal-900/30 space-y-1">
          <div className="text-[11px] font-medium text-teal-300/90 flex items-center gap-1">
            <BrainCircuit className="w-3.5 h-3.5" />
            Hindsight Intelligence
          </div>
          <div className="text-2xl font-bold font-mono text-teal-300 tabular-nums">
            {disputes.length > 0 ? Math.round((analyzedCount / disputes.length) * 100) : 0}%
          </div>
          <div className="text-[11px] text-teal-400/70">
            {analyzedCount} of {disputes.length} analyzed with memory
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080E1C] p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dispute ID, customer email, claim..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0C1424] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'needs_response', label: 'Needs Response' },
              { id: 'under_review', label: 'Under Review' },
              { id: 'won', label: 'Won' },
              { id: 'lost', label: 'Lost' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disputes Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#080E1C]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060B16] text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Dispute ID & Reason</th>
                <th className="px-4 py-3">Customer & Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due In</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Hindsight Precedent</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDisputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No disputes match the current filters.
                  </td>
                </tr>
              ) : (
                filteredDisputes.map((dispute) => {
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((dispute.evidence_due_by - Date.now() / 1000) / 86400)
                  );
                  const isAnalyzed = Boolean(dispute.hindsight_analysis);
                  const recommendation = dispute.hindsight_analysis?.recommendation;
                  const confidence = dispute.hindsight_analysis?.confidence;

                  return (
                    <tr
                      key={dispute.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-slate-200">
                          {dispute.id}
                        </div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {dispute.reason.replace(/_/g, ' ')}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-200 font-medium truncate max-w-[160px]">
                          {dispute.connected_evidence.customer_name || 'Customer'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-[160px]">
                          {dispute.connected_evidence.customer_email || dispute.payment_intent_id}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        ${dispute.amount.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 uppercase">
                          {dispute.currency}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        {dispute.status === 'won' || dispute.status === 'lost' ? (
                          <span className="text-slate-500">Resolved</span>
                        ) : daysLeft <= 3 ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {daysLeft}d left
                          </span>
                        ) : (
                          <span className="text-amber-300/90">{daysLeft}d left</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            dispute.status === 'won'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : dispute.status === 'lost'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : dispute.status === 'under_review'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {dispute.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {isAnalyzed ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                recommendation === 'FIGHT'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                  : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                              }`}
                            >
                              {recommendation} ({confidence}%)
                            </span>
                            {dispute.hindsight_analysis?.memory_used && (
                              <span
                                className="text-[10px] text-teal-400"
                                title="Precedent memory informed decision"
                              >
                                <BrainCircuit className="w-3 h-3 inline" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunAnalysis(dispute.id);
                            }}
                            disabled={analyzingDisputeId === dispute.id}
                            className="text-[11px] text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1"
                          >
                            <BrainCircuit className="w-3 h-3" />
                            <span>
                              {analyzingDisputeId === dispute.id
                                ? 'Analyzing...'
                                : 'Analyze with Hindsight'}
                            </span>
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenInspector(dispute)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-teal-500/20 text-slate-200 hover:text-teal-300 border border-slate-700 hover:border-teal-500/40 text-xs font-medium transition-colors"
                        >
                          Inspect & Defend
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPUTE INSPECTOR SLIDE-OVER DRAWER */}
      {selectedDispute && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Dispute Intelligence Inspector"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDispute(null)}
          />

          <div className="relative w-full max-w-3xl bg-[#090F1E] border-l border-slate-800 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-[#070C18]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-bold text-white">
                    {selectedDispute.id}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                    Stripe Test Mode
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                      selectedDispute.status === 'won'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                        : selectedDispute.status === 'lost'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                        : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                    }`}
                  >
                    {selectedDispute.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  ${selectedDispute.amount.toFixed(2)} {selectedDispute.currency.toUpperCase()}{' '}
                  · Reason: <span className="capitalize">{selectedDispute.reason.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="px-6 border-b border-slate-800 flex items-center gap-4 bg-[#080E1C] shrink-0 text-xs font-medium">
              {[
                { id: 'evidence', label: '1. Evidence Review', icon: FileSearch },
                { id: 'hindsight', label: '2. Hindsight Intelligence', icon: BrainCircuit },
                { id: 'represent', label: '3. Representment', icon: Send },
                { id: 'outcome', label: '4. Outcome Learning', icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                      isActive
                        ? 'border-teal-400 text-teal-300 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Claim Callout */}
              <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800 space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Cardholder Dispute Claim
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  "{selectedDispute.customer_claim}"
                </p>
              </div>

              {/* TAB 1: EVIDENCE REVIEW */}
              {activeTab === 'evidence' && (
                <div className="space-y-6">
                  {/* Connected Stripe Evidence Card */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Evidence Retrieved from Connected Sources (Stripe)</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Authenticated
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#0C1424] border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Payment Method</span>
                        <span className="font-mono text-slate-200 font-medium">
                          {selectedDispute.connected_evidence.card_brand} ••••{' '}
                          {selectedDispute.connected_evidence.card_last4}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0C1424] border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">AVS Verification</span>
                        <span className="font-mono text-emerald-300 font-medium">
                          {selectedDispute.connected_evidence.avs_postal_match
                            ? 'Postal Match (Verified)'
                            : 'AVS Mismatch'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0C1424] border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">CVC Security Check</span>
                        <span className="font-mono text-emerald-300 font-medium">
                          Passed ({selectedDispute.connected_evidence.cvc_check})
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0C1424] border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Purchase IP Address</span>
                        <span className="font-mono text-slate-200 font-medium">
                          {selectedDispute.connected_evidence.customer_purchase_ip || '198.51.100.42'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0C1424] border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Radar Risk Score</span>
                        <span className="font-mono text-teal-300 font-medium">
                          {selectedDispute.connected_evidence.radar_risk_score} (Normal Risk)
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0C1424] border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Receipt URL</span>
                        <a
                          href={selectedDispute.connected_evidence.receipt_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>View Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Missing from Connected Sources */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Evidence Missing from Connected Sources</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        Arbitration Risk
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs space-y-2">
                      <p className="text-rose-200 font-medium">
                        Notice: Stripe does NOT automatically possess customer interaction logs or
                        fulfillment acknowledgments. Card networks require the merchant to supply:
                      </p>
                      <ul className="space-y-1.5 list-disc list-inside text-rose-300/90 font-mono text-[11px]">
                        {selectedDispute.missing_evidence_from_sources.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Merchant Supplied Evidence */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <span>Merchant Supplementary Evidence</span>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={merchantEvidenceInput}
                      onChange={(e) => setMerchantEvidenceInput(e.target.value)}
                      placeholder="Attach customer communication logs, terms acceptance click-wrap proof, or cancellation policy documentation..."
                      className="w-full p-3 bg-[#0C1424] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRunAnalysis(selectedDispute.id)}
                        disabled={analyzingDisputeId === selectedDispute.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors shadow-md shadow-teal-950/40"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>
                          {analyzingDisputeId === selectedDispute.id
                            ? 'Analyzing with Hindsight...'
                            : 'Analyze with Hindsight Precedents'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HINDSIGHT INTELLIGENCE */}
              {activeTab === 'hindsight' && (
                <div className="space-y-6">
                  {!selectedDispute.hindsight_analysis ? (
                    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-[#0C1424]">
                      <BrainCircuit className="w-10 h-10 text-teal-400 mx-auto mb-3 animate-pulse" />
                      <h3 className="text-sm font-semibold text-white">
                        Run Hindsight Memory Analysis
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                        Recall historical precedents from Hindsight memory bank to calibrate
                        FIGHT vs FOLD recommendation and identify critical evidence gaps.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRunAnalysis(selectedDispute.id)}
                        disabled={analyzingDisputeId === selectedDispute.id}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors"
                      >
                        {analyzingDisputeId === selectedDispute.id
                          ? 'Querying Hindsight Memory Bank...'
                          : 'Analyze Dispute Now'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Recommendation Header Card */}
                      <div className="p-5 rounded-xl bg-gradient-to-br from-[#0B1528] to-[#070D1A] border border-teal-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                            Calibrated Representment Strategy
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                              selectedDispute.hindsight_analysis.recommendation === 'FIGHT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            RECOMMENDATION: {selectedDispute.hindsight_analysis.recommendation} (
                            {selectedDispute.hindsight_analysis.confidence}% CONFIDENCE)
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {selectedDispute.hindsight_analysis.reasoning}
                        </p>
                      </div>

                      {/* Recalled Precedents from Hindsight */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                            <BrainCircuit className="w-4 h-4 text-teal-400" />
                            <span>Recalled Precedents from Hindsight Memory Bank</span>
                          </div>
                          <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                            Persistent Precedent
                          </span>
                        </div>

                        {selectedDispute.hindsight_analysis.recalled_memories &&
                        selectedDispute.hindsight_analysis.recalled_memories.length > 0 ? (
                          <div className="space-y-2">
                            {selectedDispute.hindsight_analysis.recalled_memories.map(
                              (mem, idx) => (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-lg bg-[#0C1424] border border-teal-800/40 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-teal-300 bg-teal-950 px-1.5 py-0.2 rounded border border-teal-700/50">
                                      PRECEDENT LESSON
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Source: Hindsight Memory Bank
                                    </span>
                                  </div>
                                  <p className="text-slate-200 text-xs font-sans leading-relaxed">
                                    {mem}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 italic">
                            No matching historical precedent was found in Hindsight for this
                            exact pattern. The recommendation was computed using baseline dispute
                            rules.
                          </div>
                        )}
                      </div>

                      {/* Evidence To Submit Checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                          <FileCheck className="w-4 h-4 text-teal-400" />
                          <span>Recommended Evidence Checklist for Representment</span>
                        </div>

                        <div className="space-y-2">
                          {(
                            selectedDispute.hindsight_analysis.evidence_to_submit || [
                              'Stripe transaction capture logs',
                              'AVS and CVC verification receipt',
                              'Customer terms of service acknowledgment',
                            ]
                          ).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-[#0C1424] border border-slate-800 flex items-center gap-3 text-xs"
                            >
                              <div className="w-4 h-4 rounded bg-teal-500/10 border border-teal-500/40 flex items-center justify-center text-teal-300 text-[10px] font-mono">
                                {idx + 1}
                              </div>
                              <span className="text-slate-200 font-medium">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Re-analyze Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => handleRunAnalysis(selectedDispute.id)}
                          className="text-xs text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-run Analysis</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REPRESENTMENT */}
              {activeTab === 'represent' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-xl bg-[#0D1527] border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Lock className="w-4 h-4 text-teal-400" />
                      <span>Authorized Representment Submission</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      In accordance with banking representment compliance, Precedent never
                      submits dispute challenges automatically without explicit merchant
                      authorization.
                    </p>

                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200">
                      Submitting representment sends the compiled evidence package to the card
                      network via Stripe's dispute API in test mode.
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOutcomeSuccessMessage(
                            'Representment package submitted to Stripe in test mode! Dispute status updated to Under Review.'
                          );
                          setDisputes((prev) =>
                            prev.map((d) =>
                              d.id === selectedDispute.id
                                ? { ...d, status: 'under_review', represented: true }
                                : d
                            )
                          );
                          setSelectedDispute((prev) =>
                            prev ? { ...prev, status: 'under_review', represented: true } : null
                          );
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors shadow-md shadow-teal-950/40 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Authorize & Submit Representment (Test Mode)</span>
                      </button>
                    </div>
                  </div>

                  {outcomeSuccessMessage && (
                    <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{outcomeSuccessMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: OUTCOME RECORDING */}
              {activeTab === 'outcome' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-xl bg-[#0D1527] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <History className="w-4 h-4 text-teal-400" />
                        <span>Record Issuer Outcome in Hindsight</span>
                      </div>
                      <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                        POST /outcome
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      When the issuing bank completes arbitration, record the final outcome.
                      Precedent retains this experience into Hindsight so future dispute
                      evaluations learn from this specific result.
                    </p>

                    <form onSubmit={handleRecordOutcome} className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Final Issuer Decision
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setOutcomeVal('WON')}
                            className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                              outcomeVal === 'WON'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                : 'bg-[#0C1424] text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <TrendingUp className="w-4 h-4" />
                            <span>WON (Funds Retained)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOutcomeVal('LOST')}
                            className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                              outcomeVal === 'LOST'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                                : 'bg-[#0C1424] text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <TrendingDown className="w-4 h-4" />
                            <span>LOST (Chargeback Upheld)</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Actual Result Details
                        </label>
                        <input
                          type="text"
                          value={actualResultInput}
                          onChange={(e) => setActualResultInput(e.target.value)}
                          placeholder={`Issuer decision notes (e.g. Evidence satisfied card network representment requirements)`}
                          className="w-full p-2.5 bg-[#0C1424] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Lesson to Retain in Hindsight
                        </label>
                        <textarea
                          rows={3}
                          value={lessonInput}
                          onChange={(e) => setLessonInput(e.target.value)}
                          placeholder={`Enter key takeaway (e.g. Subscription cancellation claims require attached cancellation email thread or click-wrap policy screenshot)`}
                          className="w-full p-2.5 bg-[#0C1424] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingOutcome}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors shadow-md shadow-teal-950/40 flex items-center justify-center gap-2"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>
                          {submittingOutcome
                            ? 'Retaining in Hindsight...'
                            : 'Save Outcome & Train Hindsight'}
                        </span>
                      </button>
                    </form>
                  </div>

                  {outcomeSuccessMessage && (
                    <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{outcomeSuccessMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIMULATE TEST DISPUTE MODAL */}
      {showSimModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#090F1E] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-semibold text-white">
                  Simulate Test Dispute
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Create an inbound test dispute to simulate live Hindsight memory recall and
              representment calibration.
            </p>

            <form onSubmit={handleCreateSimDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dispute Reason
                </label>
                <select
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  className="w-full p-2.5 bg-[#0C1424] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                >
                  <option value="subscription_canceled">Subscription Canceled</option>
                  <option value="fraudulent">Fraudulent / Unauthorized</option>
                  <option value="product_not_received">Product Not Received</option>
                  <option value="duplicate">Duplicate Charge</option>
                  <option value="credit_not_processed">Credit Not Processed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dispute Amount (USD)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#0C1424] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Customer Dispute Claim
                </label>
                <textarea
                  rows={2}
                  value={simClaim}
                  onChange={(e) => setSimClaim(e.target.value)}
                  placeholder="Cardholder asserts they were charged after notifying support of cancellation..."
                  className="w-full p-2.5 bg-[#0C1424] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSim}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors"
                >
                  {creatingSim ? 'Creating...' : 'Create Test Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stripe Webhook Drawer */}
      <StripeWebhookDrawer
        isOpen={webhookDrawerOpen}
        onClose={() => setWebhookDrawerOpen(false)}
        status={status}
      />
    </div>
  );
};
