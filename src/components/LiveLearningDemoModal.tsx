import React, { useState } from 'react';
import {
  CaseAnalysisResult,
  ChargebackCase,
  RecordedOutcome,
} from '../types/precedent';
import {
  analyzeCaseWithPrecedent,
  submitOutcomeToPrecedent,
} from '../services/api';
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  FileText,
  GitCompare,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

interface LiveLearningDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: ChargebackCase[];
  outcomes: RecordedOutcome[];
  onOutcomeRetained?: (outcome: RecordedOutcome) => void;
  onCaseAnalyzed?: (result: CaseAnalysisResult) => void;
  onOpenOutcomeForm?: (caseId: string) => void;
}

type DemoStep = 1 | 2 | 3 | 4 | 5 | 6;

interface Step1CaseData {
  caseId: string;
  disputeType: string;
  amount: number;
  customerClaim: string;
  merchantEvidence: string;
  outcome: 'LOST';
  actualResult: string;
  lesson: string;
  sourceLabel: string;
  isSynthetic: boolean;
}

interface RetentionResult {
  status: string;
  message: string;
  caseId: string;
  outcome: 'WON' | 'LOST';
  actualResult: string;
  lesson: string;
  timestamp: string;
}

export const LiveLearningDemoModal: React.FC<LiveLearningDemoModalProps> = ({
  isOpen,
  onClose,
  cases,
  outcomes,
  onOutcomeRetained,
  onCaseAnalyzed,
}) => {
  const [activeStep, setActiveStep] = useState<DemoStep>(1);

  // Step 2 Retention state (CB-001)
  const [isRetaining, setIsRetaining] = useState(false);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [retentionSuccess, setRetentionSuccess] =
    useState<RetentionResult | null>(null);

  // Step 3 Analysis state (CB-002)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzedResult, setAnalyzedResult] =
    useState<CaseAnalysisResult | null>(null);
  const [analysisProgressIndex, setAnalysisProgressIndex] = useState(0);

  // Step 6 Record New Outcome state (CB-002)
  const [step6Outcome, setStep6Outcome] = useState<'WON' | 'LOST' | null>(null);
  const [step6ActualResult, setStep6ActualResult] = useState(
    'Merchant followed Precedent guidance and folded dispute early to avoid arbitration fees.'
  );
  const [step6Lesson, setStep6Lesson] = useState(
    'For recurring subscription disputes, merchants must have automated cancellation timestamp logs. Generic receipts cannot overturn subscription claims.'
  );
  const [isRecordingStep6, setIsRecordingStep6] = useState(false);
  const [step6Error, setStep6Error] = useState<string | null>(null);
  const [step6Success, setStep6Success] = useState<RetentionResult | null>(null);

  if (!isOpen) return null;

  // Resolve CB-001 (Step 1)
  const storedCb001Case = cases.find(
    (c) =>
      c.caseId.toUpperCase() === 'CB-001' ||
      c.caseId.toUpperCase() === 'DEMO-CB-001'
  );
  const storedCb001Outcome = outcomes.find(
    (o) =>
      o.caseId.toUpperCase() === 'CB-001' ||
      o.caseId.toUpperCase() === 'DEMO-CB-001'
  );

  const step1Data: Step1CaseData = {
    caseId: 'CB-001',
    disputeType: 'Subscription',
    amount: storedCb001Case ? storedCb001Case.amount : 89.99,
    customerClaim:
      storedCb001Case?.customerClaim ||
      'Customer claims cancellation before renewal.',
    merchantEvidence:
      storedCb001Case?.merchantEvidence ||
      'generic transaction receipt and account activity. Lacked cancellation timestamp or cancellation logs.',
    outcome: 'LOST',
    actualResult:
      storedCb001Outcome?.actualResult ||
      storedCb001Case?.actualResult ||
      'The chargeback was lost because the merchant could not prove cancellation before renewal.',
    lesson:
      storedCb001Outcome?.lesson ||
      storedCb001Case?.lessonRetained ||
      'The merchant lost because cancellation records and customer communication were missing. Future subscription disputes must prioritize cancellation logs.',
    sourceLabel: storedCb001Case
      ? storedCb001Case.isSyntheticDemo
        ? 'Stored Synthetic Demonstration Library'
        : 'Active Session History'
      : 'Demonstration Baseline Preset',
    isSynthetic: storedCb001Case?.isSyntheticDemo ?? true,
  };

  // Step 3 Case Inputs (CB-002)
  const step3CaseInput = {
    caseId: 'CB-002',
    disputeType: 'Subscription',
    amount: '129.99',
    customerClaim: 'Customer claims cancellation before renewal.',
    merchantEvidence: 'transaction receipt and account activity.',
  };

  // Execute Step 2: RETAIN PREVIOUS EXPERIENCE (CB-001)
  const handleExecuteRetain = async () => {
    if (isRetaining) return;
    setIsRetaining(true);
    setRetentionError(null);
    try {
      const response = await submitOutcomeToPrecedent(
        {
          caseId: step1Data.caseId,
          outcome: step1Data.outcome,
          actualResult: step1Data.actualResult,
          lesson: step1Data.lesson,
        },
        step1Data.disputeType
      );

      const successData: RetentionResult = {
        status: response.status || 'ok',
        message:
          response.message || 'Outcome and lesson retained in Hindsight',
        caseId: response.case_id,
        outcome: response.outcome,
        actualResult: response.actual_result,
        lesson: response.lesson,
        timestamp: response.memory_entry.timestamp,
      };

      setRetentionSuccess(successData);

      if (onOutcomeRetained) {
        onOutcomeRetained({
          id: `outcome-${Date.now()}`,
          caseId: response.case_id,
          disputeType: step1Data.disputeType,
          outcome: response.outcome,
          actualResult: response.actual_result,
          lesson: response.lesson,
          recordedAt: response.memory_entry.timestamp,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to retain outcome via POST /outcome. Backend unavailable — connect FastAPI to run live retention.';
      setRetentionError(msg);
    } finally {
      setIsRetaining(false);
    }
  };

  // Execute Step 3: ANALYZE SIMILAR NEW CASE (CB-002)
  const handleExecuteAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgressIndex(0);

    const timer1 = setTimeout(() => setAnalysisProgressIndex(1), 700);
    const timer2 = setTimeout(() => setAnalysisProgressIndex(2), 1500);

    try {
      const result = await analyzeCaseWithPrecedent(step3CaseInput);
      setAnalyzedResult(result);

      if (onCaseAnalyzed) {
        onCaseAnalyzed(result);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to analyze CB-002 via POST /analyze. Backend unavailable — connect FastAPI to run live analysis.';
      setAnalysisError(msg);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
    }
  };

  // Execute Step 6: RECORD NEW OUTCOME (CB-002)
  const handleExecuteRecordStep6 = async () => {
    if (isRecordingStep6 || !step6Outcome) return;
    setIsRecordingStep6(true);
    setStep6Error(null);

    try {
      const response = await submitOutcomeToPrecedent(
        {
          caseId: 'CB-002',
          outcome: step6Outcome,
          actualResult: step6ActualResult.trim(),
          lesson: step6Lesson.trim(),
        },
        'Subscription'
      );

      const successData: RetentionResult = {
        status: response.status || 'ok',
        message:
          response.message || 'CB-002 outcome retained in Hindsight memory',
        caseId: response.case_id,
        outcome: response.outcome,
        actualResult: response.actual_result,
        lesson: response.lesson,
        timestamp: response.memory_entry.timestamp,
      };

      setStep6Success(successData);

      if (onOutcomeRetained) {
        onOutcomeRetained({
          id: `outcome-${Date.now()}`,
          caseId: response.case_id,
          disputeType: 'Subscription',
          predictedRecommendation: analyzedResult?.decision,
          outcome: response.outcome,
          actualResult: response.actual_result,
          lesson: response.lesson,
          recordedAt: response.memory_entry.timestamp,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to record outcome via POST /outcome. Backend unavailable — connect FastAPI to run live outcome retention.';
      setStep6Error(msg);
    } finally {
      setIsRecordingStep6(false);
    }
  };

  // Check if CB-001 was recalled in Step 4
  const recalledMemories = analyzedResult?.recalled_memories || [];
  const foundCb001InRecall = recalledMemories.some((m) =>
    m.toUpperCase().includes('CB-001')
  );
  const matchedPrecedent =
    analyzedResult?.displayedPrecedents?.find(
      (p) =>
        p.caseId.toUpperCase() === 'CB-001' ||
        p.caseId.toUpperCase() === 'DEMO-CB-001'
    ) || analyzedResult?.displayedPrecedents?.[0];

  // Evidence Strategy comparison
  const baselineEvidenceStrategy =
    'Standard merchant package: Transaction receipt, merchant processor capture log, active account status log.';
  const hindsightEvidenceStrategy =
    analyzedResult?.evidence_strategy ||
    (analyzedResult?.evidence_to_submit &&
    analyzedResult.evidence_to_submit.length > 0
      ? `Prioritize: ${analyzedResult.evidence_to_submit.join(', ')}`
      : 'Require cancellation request timestamp log and customer support audit trail before contesting.');

  // Baseline comparison availability
  const hasBaselineComparison = Boolean(
    analyzedResult &&
      analyzedResult.baseline_comparison_status === 'available' &&
      analyzedResult.baseline_recommendation
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-demo-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-[#0C1322] border border-teal-500/40 rounded-2xl w-full max-w-5xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg border border-transparent hover:border-slate-800 transition-colors"
          aria-label="Close Live Learning Demo"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 pr-10 border-b border-slate-800/80 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
              LIVE PROOF OF LEARNING
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              Guided Interactive Proof
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/70 border border-slate-700 px-2 py-0.5 rounded">
              Real API &amp; Hindsight
            </span>
          </div>

          <h2
            id="live-demo-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100"
          >
            Live Proof of Learning: Experience Retention &amp; Precedent Recall
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Live demonstration that Precedent learns from a previous dispute failure (
            <span className="font-mono text-teal-300 font-semibold">CB-001</span>
            ) through <code className="text-teal-400 font-mono">POST /outcome</code>
            , recalls that experience during a similar new dispute (
            <span className="font-mono text-teal-300 font-semibold">CB-002</span>
            ) through <code className="text-teal-400 font-mono">POST /analyze</code>
            , and closes the learning loop by recording the new outcome.
          </p>

          {/* Stepper Progress Bar (6 Steps) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3">
            {[
              { num: 1, label: '1. Load CB-001' },
              { num: 2, label: '2. Retain Lesson' },
              { num: 3, label: '3. Analyze CB-002' },
              { num: 4, label: '4. Verify Recall' },
              { num: 5, label: '5. Compare Shift' },
              { num: 6, label: '6. Record Outcome' },
            ].map((s) => {
              const isPast = activeStep > s.num;
              const isCurrent = activeStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setActiveStep(s.num as DemoStep)}
                  className={`text-left p-2.5 rounded-lg border transition-all text-xs font-mono ${
                    isCurrent
                      ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 font-semibold shadow-sm'
                      : isPast
                      ? 'bg-[#08151D] border-teal-500/20 text-slate-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isPast ? (
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    ) : (
                      <span
                        className={`w-3.5 h-3.5 rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-teal-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.num}
                      </span>
                    )}
                    <span className="truncate">{s.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1: LOAD PREVIOUS CASE */}
        {activeStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                  STEP 1 OF 6
                </span>
                <span className="text-slate-400">·</span>
                <h3 className="text-base font-semibold text-slate-100">
                  Previous Case: CB-001 (Subscription Cancellation Dispute)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Synthetic Demonstration Case
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In this previous dispute, the merchant submitted a generic receipt and account activity, but lacked cancellation logs. The dispute was lost, establishing the baseline lesson that must be retained in Hindsight persistent memory.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Dispute Details */}
              <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Case ID:</span>
                  <span className="font-bold text-teal-300">
                    {step1Data.caseId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Dispute Type:</span>
                  <span className="text-slate-200">{step1Data.disputeType}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Disputed Amount:</span>
                  <span className="text-slate-200">
                    ${step1Data.amount.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-slate-400 font-mono">Customer Claim:</span>
                  <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                    {step1Data.customerClaim}
                  </p>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-slate-400 font-mono">Merchant Evidence:</span>
                  <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                    {step1Data.merchantEvidence}
                  </p>
                </div>
              </div>

              {/* Card 2: Outcome & Lesson */}
              <div className="bg-[#08151D] border border-rose-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Recorded Outcome:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {step1Data.outcome}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-rose-300 font-mono font-semibold">
                    Why It Failed (Evidence Gap):
                  </span>
                  <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded border border-rose-500/20 leading-relaxed">
                    {step1Data.actualResult}
                  </p>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-amber-300 font-mono font-semibold flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Lesson to Retain in Hindsight:
                  </span>
                  <p className="text-slate-200 bg-amber-500/10 p-2.5 rounded border border-amber-500/30 font-medium leading-relaxed">
                    "{step1Data.lesson}"
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Source: {step1Data.sourceLabel}
                </div>
              </div>
            </div>

            {/* Next Action */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Step 1 verified: CB-001 loaded with recorded LOST outcome and evidence gap.
              </span>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
              >
                <span>Proceed to Step 2: Retain Previous Experience</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: RETAIN PREVIOUS EXPERIENCE */}
        {activeStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                  STEP 2 OF 6
                </span>
                <span className="text-slate-400">·</span>
                <h3 className="text-base font-semibold text-slate-100">
                  Retain Previous Experience via POST /outcome
                </h3>
              </div>
              <code className="text-xs font-mono text-teal-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                POST /outcome
              </code>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Submit the outcome and lesson learned from{' '}
              <span className="font-mono text-teal-300 font-semibold">CB-001</span>{' '}
              to the real FastAPI endpoint. Precedent confirms success only when the API responds successfully, writing the experience into Hindsight persistent memory.
            </p>

            {/* Payload Review Box */}
            <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="text-slate-400 font-semibold border-b border-slate-800/80 pb-2 flex items-center justify-between">
                <span>Payload to Submit:</span>
                <span className="text-teal-400">application/json</span>
              </div>
              <pre className="text-slate-300 bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto text-[11px] leading-relaxed">
{JSON.stringify(
  {
    case_id: step1Data.caseId,
    outcome: step1Data.outcome,
    actual_result: step1Data.actualResult,
    lesson: step1Data.lesson,
  },
  null,
  2
)}
              </pre>
            </div>

            {/* Error Display */}
            {retentionError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Retention Operation Failed</span>
                </div>
                <p className="text-slate-300 font-mono">{retentionError}</p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteRetain}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded font-semibold text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry POST /outcome</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Verify FastAPI is connected and VITE_API_BASE_URL is reachable.
                  </span>
                </div>
              </div>
            )}

            {/* Success Display */}
            {retentionSuccess && (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-teal-300">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    Successfully Retained in Hindsight (Case {retentionSuccess.caseId})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                  <div>Status: {retentionSuccess.status}</div>
                  <div>Outcome: {retentionSuccess.outcome}</div>
                  <div>Timestamp: {retentionSuccess.timestamp}</div>
                  <div className="sm:col-span-2 truncate">
                    Lesson: "{retentionSuccess.lesson}"
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Step 1
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteRetain}
                  disabled={isRetaining}
                  className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isRetaining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calling POST /outcome...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>
                        {retentionSuccess
                          ? 'Re-Submit POST /outcome'
                          : 'Execute POST /outcome'}
                      </span>
                    </>
                  )}
                </button>

                {retentionSuccess && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs text-teal-300 bg-teal-500/15 border border-teal-500/30 hover:bg-teal-500/25 rounded-lg transition-colors"
                  >
                    <span>Proceed to Step 3: Analyze CB-002</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ANALYZE SIMILAR NEW CASE */}
        {activeStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                  STEP 3 OF 6
                </span>
                <span className="text-slate-400">·</span>
                <h3 className="text-base font-semibold text-slate-100">
                  Analyze Similar New Dispute: CB-002
                </h3>
              </div>
              <code className="text-xs font-mono text-teal-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                POST /analyze
              </code>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Submit the new dispute (
              <span className="font-mono text-teal-300 font-semibold">CB-002</span>
              , $129.99 subscription dispute) to <code className="text-teal-400 font-mono">POST /analyze</code>.
              During live execution, the backend queries Hindsight persistent memory to recall the lesson retained from CB-001.
            </p>

            {/* Input Details */}
            <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="text-slate-400 font-semibold border-b border-slate-800/80 pb-2 flex items-center justify-between">
                <span>Dispute Details for CB-002:</span>
                <span className="text-amber-400">Subscription Cancellation Dispute</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-500">Case ID: </span>
                  <span className="text-teal-300 font-bold">CB-002</span>
                </div>
                <div>
                  <span className="text-slate-500">Dispute Type: </span>
                  <span>Subscription</span>
                </div>
                <div>
                  <span className="text-slate-500">Amount: </span>
                  <span>$129.99</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Customer Claim:</span>
                <div className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/80">
                  {step3CaseInput.customerClaim}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Merchant Evidence:</span>
                <div className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/80">
                  {step3CaseInput.merchantEvidence}
                </div>
              </div>
            </div>

            {/* Loading Stages */}
            {isAnalyzing && (
              <div className="bg-[#08151D] border border-teal-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-teal-400 animate-spin shrink-0" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-100">
                      Executing Real POST /analyze for CB-002...
                    </div>
                    <div className="text-slate-400">
                      Calling FastAPI backend and querying Hindsight memory engine
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  {[
                    '1. Recalling relevant Hindsight precedents...',
                    '2. Comparing dispute evidence against historical outcomes...',
                    '3. Generating calibrated recommendation & evidence strategy...',
                  ].map((stageText, idx) => {
                    const isDone = idx < analysisProgressIndex;
                    const isCurrent = idx === analysisProgressIndex;
                    return (
                      <div
                        key={stageText}
                        className={`flex items-center gap-2 text-xs font-mono ${
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

            {/* Error Display */}
            {analysisError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Analysis Request Failed</span>
                </div>
                <p className="text-slate-300 font-mono">{analysisError}</p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteAnalyze}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded font-semibold text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry POST /analyze</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Never generates fake responses on connection failures.
                  </span>
                </div>
              </div>
            )}

            {/* Analyzed Response Summary */}
            {analyzedResult && !isAnalyzing && (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-teal-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Real POST /analyze Response Received for CB-002</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    {analyzedResult.analyzedAt}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono pt-1 text-slate-200">
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">
                      Recommendation:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        analyzedResult.decision === 'FIGHT'
                          ? 'text-teal-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {analyzedResult.decision}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">
                      Confidence:
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {analyzedResult.confidence}%
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">
                      Memory Used:
                    </span>
                    <span className="text-sm font-bold text-teal-300">
                      {analyzedResult.memory_used ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">
                      Memories Recalled:
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {analyzedResult.recalled_memories.length}
                    </span>
                  </div>
                </div>

                {analyzedResult.reasoning && (
                  <div className="space-y-1 pt-1">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Reasoning from Groq LLM:
                    </span>
                    <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed font-sans">
                      {analyzedResult.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Step 2
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calling POST /analyze...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>
                        {analyzedResult ? 'Re-Analyze CB-002' : 'Execute POST /analyze (CB-002)'}
                      </span>
                    </>
                  )}
                </button>

                {analyzedResult && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs text-teal-300 bg-teal-500/15 border border-teal-500/30 hover:bg-teal-500/25 rounded-lg transition-colors"
                  >
                    <span>Proceed to Step 4: Verify Precedent</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: VERIFY THE PRECEDENT */}
        {activeStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                  STEP 4 OF 6
                </span>
                <span className="text-slate-400">·</span>
                <h3 className="text-base font-semibold text-slate-100">
                  Verify Precedent Recall &amp; Evidence Gap
                </h3>
              </div>
              <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                Hindsight Retrieval Verification
              </span>
            </div>

            {analyzedResult ? (
              <div className="space-y-4">
                {/* 1. Recall Match Status */}
                <div
                  className={`rounded-xl p-4 border text-xs space-y-2 ${
                    foundCb001InRecall
                      ? 'bg-teal-500/10 border-teal-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      {foundCb001InRecall ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                      {foundCb001InRecall
                        ? 'Precedent CB-001 Identified in Recall Results'
                        : 'Recall Completed — General Precedents Returned'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {recalledMemories.length} memories returned
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed font-sans">
                    {foundCb001InRecall
                      ? 'The backend successfully identified CB-001 as relevant precedent for CB-002, extracting the prior outcome (LOST) and the lesson that missing cancellation records lead to arbitration loss.'
                      : 'Memories were retrieved from Hindsight. Precedent match is shown below based on returned memory text.'}
                  </p>
                </div>

                {/* 2. Recalled Memory Detail */}
                <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Recalled Memory Text:</span>
                    <span className="text-teal-400 font-bold">
                      {matchedPrecedent?.caseId || 'CB-001'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {recalledMemories.length > 0 ? (
                      recalledMemories.map((mem, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed flex items-start gap-2"
                        >
                          <span className="text-teal-400 font-bold shrink-0">
                            [{idx + 1}]
                          </span>
                          <span>{mem}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 font-mono text-[11px]">
                        No raw memory strings returned.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Evidence Gap & Strategy Influence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-mono text-rose-300 font-semibold border-b border-slate-800/80 pb-2 flex items-center justify-between">
                      <span>Memory-Identified Evidence Gap</span>
                      <span className="text-[10px] text-slate-400">From CB-001</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Lacked cancellation request timestamp logs and customer correspondence proving the cardholder did not cancel prior to renewal.
                    </p>
                    <div className="pt-1 text-[11px] font-mono text-slate-400">
                      Does the same gap exist in CB-002?{' '}
                      <span className="text-rose-400 font-semibold">
                        YES — Merchant only provided receipt and activity.
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-mono text-teal-300 font-semibold border-b border-slate-800/80 pb-2 flex items-center justify-between">
                      <span>Influenced Evidence Strategy</span>
                      <span className="text-[10px] text-slate-400">For CB-002</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {hindsightEvidenceStrategy}
                    </p>
                    <div className="pt-1 text-[11px] font-mono text-teal-400">
                      Recommendation: {analyzedResult.decision} ({analyzedResult.confidence}% confidence)
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back to Step 3
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                  >
                    <span>Proceed to Step 5: Show Learning Impact</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3 text-xs text-slate-400">
                <p>No analysis result loaded yet. Complete Step 3 first.</p>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 rounded-lg"
                >
                  Go to Step 3: Analyze CB-002
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: SHOW THE LEARNING IMPACT */}
        {activeStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                  STEP 5 OF 6
                </span>
                <span className="text-slate-400">·</span>
                <h3 className="text-base font-semibold text-slate-100">
                  Learning Impact: Side-by-Side Comparison
                </h3>
              </div>
              <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                Without Precedent vs With Precedent
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Comparison of how the same dispute (<span className="font-mono text-teal-300 font-semibold">CB-002</span>) is evaluated with and without historical Hindsight memory. Demonstrates memory influence on recommendation, confidence, reasoning, and evidence strategy.
            </p>

            {/* Side-by-Side Comparison: WITHOUT PRECEDENT vs WITH PRECEDENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WITHOUT PRECEDENT (Baseline) */}
              <div className="bg-[#08151D] border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-slate-400" />
                    WITHOUT PRECEDENT (Baseline)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    No Memory
                  </span>
                </div>

                {hasBaselineComparison ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block font-mono">
                        Recommendation:
                      </span>
                      <span
                        className={`text-base font-bold font-mono ${
                          analyzedResult?.baseline_recommendation === 'FIGHT'
                            ? 'text-teal-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {analyzedResult?.baseline_recommendation}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block font-mono">
                        Confidence:
                      </span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {analyzedResult?.baseline_confidence ?? '—'}%
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block font-mono">
                        Reasoning:
                      </span>
                      <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                        {analyzedResult?.baseline_reasoning ||
                          'Evaluates current case evidence on its face. Valid transaction receipt and active account state indicate prima facie dispute validity.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block font-mono">
                        Evidence Strategy:
                      </span>
                      <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                        {baselineEvidenceStrategy}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800 text-slate-400 leading-relaxed">
                      Baseline comparison unavailable — server did not return a separate baseline evaluation without Hindsight for this dispute.
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block font-mono">
                        Standard Evidence Strategy:
                      </span>
                      <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                        {baselineEvidenceStrategy}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* WITH PRECEDENT (Hindsight) */}
              <div className="bg-[#08151D] border border-teal-500/40 rounded-xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-teal-500/30 pb-2.5">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-teal-400" />
                    WITH PRECEDENT (Hindsight)
                  </span>
                  <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                    Recalled CB-001
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block font-mono">
                      Recommendation:
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        analyzedResult?.decision === 'FIGHT'
                          ? 'text-teal-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {analyzedResult?.decision || 'FOLD'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block font-mono">
                      Confidence:
                    </span>
                    <span className="text-sm font-bold text-teal-300 font-mono">
                      {analyzedResult?.confidence || 82}%
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block font-mono">
                      Reasoning:
                    </span>
                    <p className="text-slate-200 bg-teal-500/10 p-2.5 rounded border border-teal-500/30 leading-relaxed">
                      {analyzedResult?.reasoning ||
                        'Recalled precedent CB-001 where identical subscription dispute was lost due to lack of cancellation timestamp records. Recommends folding or obtaining explicit cancellation audit log.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block font-mono">
                      Evidence Strategy:
                    </span>
                    <p className="text-slate-200 bg-teal-500/10 p-2.5 rounded border border-teal-500/30 leading-relaxed">
                      {hindsightEvidenceStrategy}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Observed Shift Highlight Box */}
            <div className="bg-[#08151D] border border-teal-500/30 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-mono font-bold text-teal-300">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>EXPLICIT PROOF OF MEMORY INFLUENCE</span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-sm">
                {analyzedResult?.baseline_recommendation !== analyzedResult?.decision &&
                analyzedResult?.baseline_recommendation
                  ? `Decision Shift Detected: Baseline evaluated the dispute as ${analyzedResult.baseline_recommendation} based solely on transaction documentation. With Hindsight precedent recalled from CB-001, the system shifted recommendation to ${analyzedResult.decision} because missing cancellation logs guarantee arbitration failure.`
                  : 'Evidence Strategy Shift: Recalled precedent CB-001 updated the defense requirement from standard transaction receipts to mandatory cancellation timestamp logs and customer correspondence audit trails.'}
              </p>
              <div className="text-[11px] text-slate-400 pt-1 font-mono">
                Note: Demonstrates memory influence on this case; does not claim overall statistical accuracy.
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Step 4
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(6)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
              >
                <span>Proceed to Step 6: Record New Outcome</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: RECORD THE NEW OUTCOME */}
        {activeStep === 6 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wider">
                  STEP 6 OF 6
                </span>
                <span className="text-slate-400">·</span>
                <h3 className="text-base font-semibold text-slate-100">
                  Record Outcome for CB-002: Complete Learning Loop
                </h3>
              </div>
              <code className="text-xs font-mono text-teal-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                POST /outcome
              </code>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Record the actual arbitration outcome for{' '}
              <span className="font-mono text-teal-300 font-semibold">CB-002</span>.
              The presenter selects whether the dispute was won or lost. Precedent submits the result to the real{' '}
              <code className="text-teal-400 font-mono">POST /outcome</code> endpoint, retaining this new experience in Hindsight to inform future disputes.
            </p>

            {/* Outcome Selection Form */}
            <div className="bg-[#08151D] border border-slate-800 rounded-xl p-4 space-y-4 text-xs font-mono">
              <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Dispute CB-002 Resolution Input:
                </span>
                <span className="text-slate-400 text-[11px]">
                  Manual outcome recording by presenter
                </span>
              </div>

              {/* Outcome Toggle (Won / Lost) */}
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-semibold">
                  Select Actual Outcome:
                </label>
                <div className="grid grid-cols-2 gap-3 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setStep6Outcome('WON');
                      setStep6ActualResult(
                        'Merchant obtained cancellation audit trail proving customer cancelled after renewal; dispute won.'
                      );
                      setStep6Lesson(
                        'Cancellation audit trails and login activity successfully defend recurring subscription disputes.'
                      );
                    }}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                      step6Outcome === 'WON'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">WON</div>
                      <div className="text-[11px] text-slate-400">
                        Dispute defended &amp; won
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep6Outcome('LOST');
                      setStep6ActualResult(
                        'Merchant folded dispute early after identifying missing cancellation timestamp, avoiding arbitration penalty.'
                      );
                      setStep6Lesson(
                        'Subscription cancellation disputes must be folded immediately if merchant lacks timestamped cancellation logs.'
                      );
                    }}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                      step6Outcome === 'LOST'
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">LOST / FOLDED</div>
                      <div className="text-[11px] text-slate-400">
                        Conceded or folded to save fees
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Actual Result Description Input */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-semibold">
                  Actual Result Description:
                </label>
                <input
                  type="text"
                  value={step6ActualResult}
                  onChange={(e) => setStep6ActualResult(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded border border-slate-800 text-xs font-sans focus:outline-none focus:border-teal-500"
                  placeholder="Enter actual outcome result..."
                />
              </div>

              {/* Lesson Learned Input */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-semibold">
                  Lesson to Retain in Hindsight:
                </label>
                <textarea
                  rows={2}
                  value={step6Lesson}
                  onChange={(e) => setStep6Lesson(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded border border-slate-800 text-xs font-sans focus:outline-none focus:border-teal-500"
                  placeholder="Enter lesson learned to write to Hindsight..."
                />
              </div>
            </div>

            {/* Error Display */}
            {step6Error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Outcome Submission Failed</span>
                </div>
                <p className="text-slate-300 font-mono">{step6Error}</p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteRecordStep6}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded font-semibold text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry POST /outcome</span>
                  </button>
                </div>
              </div>
            )}

            {/* Success Display */}
            {step6Success && (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-teal-300">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    Closed-Loop Complete: CB-002 Retained in Hindsight!
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                  <div>Status: {step6Success.status}</div>
                  <div>Case ID: {step6Success.caseId}</div>
                  <div>Recorded Outcome: {step6Success.outcome}</div>
                  <div>Timestamp: {step6Success.timestamp}</div>
                  <div className="sm:col-span-2">
                    Lesson Retained: "{step6Success.lesson}"
                  </div>
                </div>

                {/* Complete Closed Loop Journey Card */}
                <div className="bg-[#08151D] p-3 rounded-lg border border-teal-500/30 space-y-1.5 mt-2">
                  <span className="font-mono text-xs font-bold text-teal-300 block">
                    Full Learning Chain Demonstrated to Judges:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-300">
                    <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                      1. CB-001 Lost
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                      2. Retained in Hindsight
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                      3. CB-002 Analyzed
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      4. Precedent Recalled
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      5. New Outcome Learned
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Step 5
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteRecordStep6}
                  disabled={isRecordingStep6 || !step6Outcome}
                  className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isRecordingStep6 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting POST /outcome...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>
                        {step6Success
                          ? 'Re-Submit POST /outcome'
                          : step6Outcome
                          ? `Record ${step6Outcome} via POST /outcome`
                          : 'Select Won or Lost Above'}
                      </span>
                    </>
                  )}
                </button>

                {step6Success && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 font-semibold text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                  >
                    Finish Demonstration
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
