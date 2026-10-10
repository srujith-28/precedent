import React, { useEffect, useState } from 'react';
import { StripePayment, StripeStatus } from '../types/stripe';
import { createTestDispute, fetchStripePayments } from '../services/stripeApi';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';

interface StripePaymentsViewProps {
  status: StripeStatus;
  onRefreshStatus: () => void;
  onSelectDisputeTab?: () => void;
}

export const StripePaymentsView: React.FC<StripePaymentsViewProps> = ({
  status,
  onRefreshStatus,
  onSelectDisputeTab,
}) => {
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [disputedFilter, setDisputedFilter] = useState<'all' | 'disputed' | 'clean'>('all');
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchStripePayments();
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleSimulateDisputeOnPayment = async (payment: StripePayment) => {
    setSimulatingId(payment.id);
    try {
      await createTestDispute({
        reason: 'subscription_canceled',
        amount: payment.amount,
        customer_claim: `Cardholder disputed charge for ${payment.description || 'SaaS subscription'}.`,
      });
      loadPayments();
      if (onSelectDisputeTab) {
        onSelectDisputeTab();
      }
    } finally {
      setSimulatingId(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (disputedFilter === 'disputed' && !p.disputed) return false;
    if (disputedFilter === 'clean' && p.disputed) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      (p.customer_email || '').toLowerCase().includes(q) ||
      (p.customer_name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  });

  const totalCaptured = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDisputedAmount = payments
    .filter((p) => p.disputed)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-400" />
              Stripe Test Payments
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Stripe Test Mode (Sandbox)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Payment transactions captured through Stripe test API and sandbox simulation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              loadPayments();
              onRefreshStatus();
            }}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-[#0C1322] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Refresh payments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#080E1C] border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Test Payments</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {payments.length}
          </div>
          <div className="text-[11px] text-slate-500">In sandbox dataset</div>
        </div>

        <div className="p-4 rounded-xl bg-[#080E1C] border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Volume Captured</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            ${totalCaptured.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Gross settled payments</div>
        </div>

        <div className="p-4 rounded-xl bg-[#080E1C] border border-amber-900/30 space-y-1">
          <div className="text-[11px] font-medium text-amber-300/90 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Disputed Transactions
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {payments.filter((p) => p.disputed).length}
          </div>
          <div className="text-[11px] text-amber-400/70">
            ${totalDisputedAmount.toFixed(2)} at risk
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#080E1C] border border-teal-900/30 space-y-1">
          <div className="text-[11px] font-medium text-teal-300/90 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Radar Protected
          </div>
          <div className="text-2xl font-bold font-mono text-teal-300 tabular-nums">100%</div>
          <div className="text-[11px] text-teal-400/70">AI fraud & risk scored</div>
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
            placeholder="Search payment ID, customer name, email..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0C1424] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Payments' },
              { id: 'disputed', label: 'Disputed' },
              { id: 'clean', label: 'Undisputed' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setDisputedFilter(filter.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                disputedFilter === filter.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#080E1C]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060B16] text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Payment ID & Description</th>
                <th className="px-4 py-3">Customer Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Radar Risk</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Dispute Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No payments match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-slate-200">
                        {payment.id}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {payment.description || 'Payment Intent'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">
                        {payment.customer_name || 'Customer'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {payment.customer_email || 'no-email@example.com'}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-semibold text-white">
                      ${payment.amount.toFixed(2)}{' '}
                      <span className="text-[10px] text-slate-500 uppercase">
                        {payment.currency}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-slate-300">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {payment.card_brand} •••• {payment.card_last4}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                          payment.radar_risk_level === 'normal'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        <Shield className="w-2.5 h-2.5" />
                        <span>Score: {payment.radar_risk_score}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {new Date(payment.created * 1000).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      {payment.disputed ? (
                        <button
                          type="button"
                          onClick={onSelectDisputeTab}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors"
                          title="Click to view dispute details"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Disputed</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Settled</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSimulateDisputeOnPayment(payment)}
                            disabled={simulatingId === payment.id}
                            className="text-[10px] text-slate-500 hover:text-teal-300 transition-colors font-mono"
                            title="Simulate inbound chargeback on this test payment"
                          >
                            {simulatingId === payment.id ? 'Simulating...' : '+ Dispute'}
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {payment.receipt_url ? (
                        <a
                          href={payment.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-mono"
                        >
                          <span>Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
