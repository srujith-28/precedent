import React, { useEffect, useState } from 'react';
import { StripeStatus, StripeWebhookEvent } from '../types/stripe';
import { fetchStripeWebhooks } from '../services/stripeApi';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Radio,
  RefreshCw,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from 'lucide-react';

interface StripeWebhookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  status: StripeStatus;
}

export const StripeWebhookDrawer: React.FC<StripeWebhookDrawerProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  const [events, setEvents] = useState<StripeWebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const data = await fetchStripeWebhooks();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWebhooks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cliCommand =
    'stripe listen --forward-to http://localhost:3000/api/stripe/webhook';

  const handleCopy = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Stripe Webhook Configuration & Event Log"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-[#090F1E] border-l border-slate-800 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-[#070C18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Stripe Webhook Pipeline
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  Test Mode Sandbox
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Idempotent event ingestion with HMAC-SHA256 signature verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CLI Instructions Card */}
          <div className="bg-[#0D1527] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>Stripe CLI Forwarding Setup</span>
              </div>
              <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                Official Stripe SDK
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To stream live Stripe test webhook events directly into Precedent, forward
              events from the Stripe CLI to your local server:
            </p>

            <div className="relative flex items-center justify-between bg-black/60 border border-slate-800 rounded-lg p-3 font-mono text-xs text-cyan-300">
              <span className="select-all overflow-x-auto pr-8">{cliCommand}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-slate-400 hover:text-white p-1 rounded transition-colors"
                title="Copy command"
              >
                {copiedCmd ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Endpoint URL</span>
                <code className="text-slate-200 font-mono text-[11px]">
                  /api/stripe/webhook
                </code>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Signing Secret</span>
                <span className="text-slate-200 font-mono text-[11px]">
                  {status.webhook_secret_configured
                    ? 'whsec_•••••••• (Configured)'
                    : 'STRIPE_WEBHOOK_SECRET (Optional in sandbox)'}
                </span>
              </div>
            </div>
          </div>

          {/* Supported Events */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Handled Event Types
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {[
                { name: 'charge.dispute.created', desc: 'Ingests new dispute into queue' },
                { name: 'charge.dispute.closed', desc: 'Updates resolution status in Hindsight' },
                { name: 'payment_intent.succeeded', desc: 'Records verified capture record' },
                { name: 'payment_intent.payment_failed', desc: 'Logs failed authorization' },
              ].map((ev) => (
                <div
                  key={ev.name}
                  className="p-2.5 rounded-lg bg-[#0C1424] border border-slate-800/80 flex flex-col gap-1"
                >
                  <span className="text-teal-300 font-semibold text-[11px]">{ev.name}</span>
                  <span className="text-slate-400 text-[11px] font-sans">{ev.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Events Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">
                  Received Webhook Event Ledger ({events.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={loadWebhooks}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-[#0A101E]">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-300">
                  No Webhook Events Received Yet
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start the Stripe CLI listener or trigger a test event in Stripe dashboard.
                  All genuine webhook deliveries will appear here with cryptographic
                  signature confirmation.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-lg bg-[#0C1424] border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-teal-300 font-semibold">{evt.type}</span>
                        {evt.verified ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                            Verified Sig
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            Sandbox
                          </span>
                        )}
                        <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded">
                          Idempotent
                        </span>
                      </div>
                      <div className="text-slate-300 text-xs">{evt.summary}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        ID: {evt.id} · Target: {evt.data_object_id || 'n/a'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(evt.created * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
