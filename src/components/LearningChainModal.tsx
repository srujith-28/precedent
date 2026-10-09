import React from 'react';
import { ChargebackCase, RecordedOutcome } from '../types/precedent';
import {
  ArrowDown,
  ArrowRight,
  Brain,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  GitCompare,
  History,
  Lightbulb,
  Scale,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

interface LearningChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  case1?: ChargebackCase;
  case2?: ChargebackCase;
  outcomes: RecordedOutcome[];
  onSelectCaseInWorkspace?: (c: ChargebackCase) => void;
  onOpenRecordOutcome?: (caseId: string) => void;
}

export const LearningChainModal: React.FC<LearningChainModalProps> = ({
  isOpen,
  onClose,
  case1,
  case2,
  outcomes,
  onSelectCaseInWorkspace,
  onOpenRecordOutcome,
}) => {
  if (!isOpen) return null;

  // Defaults or derived cases
  const c1CaseId = case1 ? case1.caseId : 'CB-001';
  const c2CaseId = case2 ? case2.caseId : 'CB-002';

  const c1OutcomeRecord = outcomes.find(
    (o) => o.caseId.toLowerCase() === c1CaseId.toLowerCase()
  );
  const c2OutcomeRecord = outcomes.find(
    (o) => o.caseId.toLowerCase() === c2CaseId.toLowerCase()
  );

  const c1Outcome =
    c1OutcomeRecord?.outcome || (case1 ? case1.outcome : 'LOST');
  const c1Lesson =
    c1OutcomeRecord?.lesson ||
    case1?.lessonRetained ||
    'Future subscription disputes should prioritize cancellation records and customer communication.';

  const c2Rec = case2?.decision || case2?.recommendation || 'FOLD';
  const c2Confidence = case2?.confidence || 82;
  const c2Reasoning =
    case2?.analysis?.reasoning ||
    'Historical precedent CB-001 established that subscription disputes fail when communication and cancellation records are absent.';

  const c2Outcome = c2OutcomeRecord?.outcome || case2?.outcome;
  const c2OutcomeRecorded = Boolean(c2OutcomeRecord || case2?.outcomeRecorded);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-chain-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-[#0C1322] border border-teal-500/30 rounded-2xl w-full max-w-4xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg border border-transparent hover:border-slate-800 transition-colors"
          aria-label="Close Learning Chain"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-10 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
              PRECEDENT DECISION LOOP
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              Learning Chain Provenance
            </span>
          </div>
          <h2
            id="learning-chain-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100"
          >
            {c1CaseId} → Lesson → {c2CaseId} → Decision → Outcome
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Visualizing the exact end-to-end learning cycle: how an outcome in an initial case becomes persistent Hindsight experience that directly guides a subsequent similar dispute.
          </p>
        </div>

        {/* Vertical Stepper: 5 Stages */}
        <div className="space-y-6">
          {/* STAGE 1: CB-001 (Initial Dispute) */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                1
              </div>
              <div className="w-0.5 h-full min-h-[40px] bg-slate-800 my-1.5" />
            </div>

            <div className="flex-1 bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-100">
                    STAGE 1: {c1CaseId} (Initial Dispute)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Subscription Cancellation
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                  Outcome: {c1Outcome}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-mono text-[10px] uppercase">
                    Merchant Had
                  </span>
                  <p className="text-slate-200">
                    {case1?.merchantEvidence ||
                      'Transaction receipt and active account activity.'}
                  </p>
                </div>
                <div>
                  <span className="text-rose-400 block font-mono text-[10px] uppercase">
                    Critical Evidence Missing
                  </span>
                  <p className="text-slate-300">
                    Cancellation timestamp log and customer communication records.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* STAGE 2: Lesson Retained in Hindsight */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                2
              </div>
              <div className="w-0.5 h-full min-h-[40px] bg-slate-800 my-1.5" />
            </div>

            <div className="flex-1 bg-[#080D19] border border-cyan-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    STAGE 2: Precedent Retained in Hindsight
                  </span>
                </div>
                <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                  POST /outcome
                </span>
              </div>

              <div className="text-xs text-slate-100 bg-[#0C1322] border border-slate-800 rounded-lg p-3 leading-relaxed">
                <strong className="text-cyan-400 font-mono block text-[11px] mb-1">
                  RETAINED LESSON:
                </strong>
                {c1Lesson}
              </div>
            </div>
          </div>

          {/* STAGE 3: CB-002 Recalls CB-001 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                3
              </div>
              <div className="w-0.5 h-full min-h-[40px] bg-slate-800 my-1.5" />
            </div>

            <div className="flex-1 bg-[#080D19] border border-teal-500/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-teal-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-teal-300">
                    STAGE 3: {c2CaseId} Recalls {c1CaseId} Precedent
                  </span>
                </div>
                <span className="font-mono text-[10px] text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                  memory_used = true
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-mono text-[10px] uppercase">
                    Evidence Gap Identified
                  </span>
                  <p className="text-amber-300 font-medium mt-0.5">
                    Same evidence gap: Merchant lacks cancellation records and customer communication.
                  </p>
                </div>
                <div>
                  <span className="text-teal-400 block font-mono text-[10px] uppercase">
                    Evidence Strategy Altered
                  </span>
                  <p className="text-slate-200 mt-0.5">
                    Prioritize cancellation timestamp logs and pre-billing cancellation notice.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* STAGE 4: Decision Generation */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                4
              </div>
              <div className="w-0.5 h-full min-h-[40px] bg-slate-800 my-1.5" />
            </div>

            <div className="flex-1 bg-[#080D19] border border-slate-800/90 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="font-mono text-xs font-bold text-slate-100">
                  STAGE 4: Memory-Informed Decision for {c2CaseId}
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                    c2Rec.includes('FIGHT')
                      ? 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  {c2Rec} ({c2Confidence}%)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {c2Reasoning}
              </p>
            </div>
          </div>

          {/* STAGE 5: Outcome Feedback & Continuous Loop */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                5
              </div>
            </div>

            <div className="flex-1 bg-[#080D19] border border-violet-500/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-violet-300">
                    STAGE 5: {c2CaseId} Outcome &amp; Future Continuity
                  </span>
                </div>
                {c2OutcomeRecorded ? (
                  <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                    Outcome: {c2Outcome}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    Outcome Not Recorded Yet
                  </span>
                )}
              </div>

              {c2OutcomeRecorded ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-100">
                    Loop Completed for {c2CaseId}:
                  </p>
                  <p className="text-slate-400">
                    Lesson retained into Hindsight memory, now ready to guide subsequent disputes (e.g. CB-003, CB-010).
                  </p>
                </div>
              ) : onOpenRecordOutcome ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Once arbitration resolves for {c2CaseId}, submit the outcome to close the learning loop.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRecordOutcome(c2CaseId);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Record Outcome for {c2CaseId}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Business Value Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-slate-300 max-w-2xl">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-100 font-medium">Business Value:</strong>{' '}
              Precedent does not treat every dispute as an isolated decision. Previous outcomes become persistent experience that can influence evidence strategy and future decision support.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors shrink-0"
          >
            Close Provenance View
          </button>
        </div>
      </div>
    </div>
  );
};
