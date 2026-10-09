import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CaseAnalysisResult,
  CaseFormInput,
  ChargebackCase,
  ConnectionState,
  MemoryEntry,
  OutcomeFormInput,
  RecordedOutcome,
  ToastNotification,
} from '../types/precedent';
import {
  analyzeCaseWithPrecedent,
  checkBackendConnection,
  submitOutcomeToPrecedent,
} from '../services/api';
import {
  DEMONSTRATION_CASES,
  DEMONSTRATION_OUTCOMES,
} from '../data/historicalDemonstrationCases';

interface LiveMetrics {
  casesAnalyzed: number;
  memoriesRecalled: number;
  uniquePrecedents: number;
  outcomesLearned: number;
  memoryGuidedDecisions: number;
  demoCasesCount: number;
}

interface PrecedentStoreContextValue {
  cases: ChargebackCase[];
  memories: MemoryEntry[];
  outcomes: RecordedOutcome[];
  currentAnalysis: CaseAnalysisResult | null;
  currentDisputeAmount: number;
  lastAnalysisAt: string | null;
  backendStatus: ConnectionState;
  hindsightStatus: ConnectionState;
  isAnalyzing: boolean;
  analysisStageIndex: number;
  isSubmittingOutcome: boolean;
  isSyncingDemoToHindsight: boolean;
  syncedDemoCaseIds: string[];
  analyzeError: string | null;
  outcomeError: string | null;
  toasts: ToastNotification[];
  metrics: LiveMetrics;
  runAnalyze: (input: CaseFormInput) => Promise<CaseAnalysisResult | null>;
  recordOutcome: (input: OutcomeFormInput) => Promise<boolean>;
  syncDemoToHindsight: () => Promise<{ success: number; failed: number }>;
  refreshConnectionStatus: () => Promise<void>;
  dismissToast: (id: string) => void;
  clearAnalyzeError: () => void;
  clearOutcomeError: () => void;
  setCurrentAnalysisView: (
    analysis: CaseAnalysisResult | null,
    amount?: number
  ) => void;
  registerRetainedOutcome: (outcome: RecordedOutcome) => void;
  registerAnalyzedCase: (result: CaseAnalysisResult, amount?: number) => void;
}

const PrecedentStoreContext = createContext<PrecedentStoreContextValue | null>(
  null
);

export const PrecedentStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cases, setCases] = useState<ChargebackCase[]>(DEMONSTRATION_CASES);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [outcomes, setOutcomes] = useState<RecordedOutcome[]>(DEMONSTRATION_OUTCOMES);
  const [syncedDemoCaseIds, setSyncedDemoCaseIds] = useState<string[]>([]);
  const [isSyncingDemoToHindsight, setIsSyncingDemoToHindsight] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] =
    useState<CaseAnalysisResult | null>(null);
  const [currentDisputeAmount, setCurrentDisputeAmount] = useState<number>(0);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<string | null>(null);

  const [backendStatus, setBackendStatus] =
    useState<ConnectionState>('checking');
  const [hindsightStatus, setHindsightStatus] =
    useState<ConnectionState>('checking');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStageIndex, setAnalysisStageIndex] = useState(0);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);

  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const pushToast = useCallback(
    (type: ToastNotification['type'], title: string, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4800);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshConnectionStatus = useCallback(async () => {
    setBackendStatus('checking');
    setHindsightStatus('checking');
    const res = await checkBackendConnection();
    setBackendStatus(res.backendConnected ? 'connected' : 'disconnected');
    setHindsightStatus(res.hindsightConnected ? 'connected' : 'disconnected');
  }, []);

  useEffect(() => {
    refreshConnectionStatus();
  }, [refreshConnectionStatus]);

  // Cycle loading stage messages while /analyze is in-flight
  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStageIndex(0);
      return;
    }
    const timer1 = setTimeout(() => setAnalysisStageIndex(1), 850);
    const timer2 = setTimeout(() => setAnalysisStageIndex(2), 1800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isAnalyzing]);

  const runAnalyze = useCallback(
    async (input: CaseFormInput): Promise<CaseAnalysisResult | null> => {
      if (isAnalyzing) return null;
      setIsAnalyzing(true);
      setAnalyzeError(null);

      try {
        const result = await analyzeCaseWithPrecedent(input);
        const amountNum = parseFloat(input.amount) || 0;

        // Verified live response from FastAPI & Hindsight
        setBackendStatus('connected');
        setHindsightStatus('connected');
        setCurrentAnalysis(result);
        setCurrentDisputeAmount(amountNum);
        setLastAnalysisAt(result.analyzedAt);

        // Check if an outcome was already recorded for this Case ID in the current session
        const existingOutcome = outcomes.find(
          (o) => o.caseId.toLowerCase() === result.caseId.toLowerCase()
        );

        const newCase: ChargebackCase = {
          id: `case-${Date.now()}`,
          caseId: result.caseId,
          disputeType: input.disputeType.trim(),
          amount: amountNum,
          customerClaim: input.customerClaim.trim(),
          merchantEvidence: input.merchantEvidence.trim(),
          decision: result.decision,
          recommendation: result.recommendation,
          confidence: result.confidence,
          outcome: existingOutcome ? existingOutcome.outcome : 'PENDING',
          outcomeRecorded: Boolean(existingOutcome),
          actualResult: existingOutcome?.actualResult,
          lessonRetained: existingOutcome?.lesson,
          submittedAt: result.analyzedAt,
          analysis: result,
        };

        setCases((prev) => {
          const existingIndex = prev.findIndex(
            (c) => c.caseId.toLowerCase() === newCase.caseId.toLowerCase()
          );
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...newCase,
              id: prev[existingIndex].id,
              outcome: prev[existingIndex].outcomeRecorded
                ? prev[existingIndex].outcome
                : newCase.outcome,
              outcomeRecorded: prev[existingIndex].outcomeRecorded,
              actualResult:
                prev[existingIndex].actualResult || newCase.actualResult,
              lessonRetained:
                prev[existingIndex].lessonRetained || newCase.lessonRetained,
            };
            return updated;
          }
          return [newCase, ...prev];
        });

        // Store consolidated precedent entries (1 per unique Case ID) with rawMemories attached
        const allConsolidatedPrecedents = [
          ...result.displayedPrecedents,
          ...result.excludedCurrentCasePrecedents,
        ];

        if (allConsolidatedPrecedents.length > 0) {
          setMemories((prev) => {
            const nextMemories = [...prev];
            allConsolidatedPrecedents.forEach((p) => {
              const entry: MemoryEntry = {
                id: p.id,
                memoryCode: p.caseId,
                caseIdOrigin: p.hasReliableCaseId ? p.caseId : undefined,
                patternTitle: `${p.caseId} · ${p.disputeType}`,
                disputeType: p.disputeType,
                outcomeLearnedFrom: p.outcome,
                lesson: p.consolidatedLesson,
                rawMemories: p.rawMemories,
                rawMemoryCount: p.rawMemoryCount,
                relevanceContext: `${p.rawMemoryCount} Hindsight memory ${
                  p.rawMemoryCount === 1 ? 'entry' : 'entries'
                } consolidated during analysis of ${result.caseId}`,
                sourceType: 'RECALLED FROM HINDSIGHT',
                timestamp: p.timestamp,
              };

              const existingIdx = nextMemories.findIndex(
                (m) =>
                  m.sourceType === 'RECALLED FROM HINDSIGHT' &&
                  (m.caseIdOrigin || m.memoryCode).toUpperCase() ===
                    p.caseId.toUpperCase()
              );

              if (existingIdx !== -1) {
                nextMemories[existingIdx] = entry;
              } else {
                nextMemories.unshift(entry);
              }
            });
            return nextMemories;
          });
        }

        const rawCount = result.recalled_memories.length;
        const uniqueCount = result.uniquePrecedentsCount;

        pushToast(
          'success',
          `Analysis Complete: ${result.caseId} (${result.decision})`,
          result.memory_used
            ? `${uniqueCount} unique ${
                uniqueCount === 1 ? 'precedent' : 'precedents'
              } recalled from ${rawCount} Hindsight memory ${
                rawCount === 1 ? 'entry' : 'entries'
              }.`
            : `Case ${result.caseId} evaluated with ${result.confidence}% confidence.`
        );

        return result;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Backend unavailable — connect FastAPI to run live analysis.';
        setAnalyzeError(msg);
        setBackendStatus('disconnected');
        setHindsightStatus('disconnected');
        pushToast('error', 'Analysis Failed', msg);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isAnalyzing, outcomes, pushToast]
  );

  const recordOutcome = useCallback(
    async (input: OutcomeFormInput): Promise<boolean> => {
      if (isSubmittingOutcome) return false;
      setIsSubmittingOutcome(true);
      setOutcomeError(null);

      try {
        const matchedCase = cases.find(
          (c) => c.caseId.toLowerCase() === input.caseId.trim().toLowerCase()
        );
        const disputeType = matchedCase?.disputeType || 'Subscription';

        const response = await submitOutcomeToPrecedent(input, disputeType);

        setBackendStatus('connected');
        setHindsightStatus('connected');

        const newOutcomeRecord: RecordedOutcome = {
          id: `outcome-${Date.now()}`,
          caseId: response.case_id,
          disputeType: matchedCase?.disputeType,
          predictedRecommendation: matchedCase?.decision,
          outcome: response.outcome,
          actualResult: response.actual_result,
          lesson: response.lesson,
          recordedAt: response.memory_entry.timestamp,
        };

        setOutcomes((prev) => {
          const filtered = prev.filter(
            (o) => o.caseId.toLowerCase() !== response.case_id.toLowerCase()
          );
          return [newOutcomeRecord, ...filtered];
        });

        setMemories((prev) => {
          const filtered = prev.filter(
            (m) =>
              !(
                m.sourceType === 'RETAINED IN HINDSIGHT' &&
                m.caseIdOrigin?.toLowerCase() === response.case_id.toLowerCase()
              )
          );
          return [response.memory_entry, ...filtered];
        });

        // Update matching case in Case History if it was analyzed in this session
        setCases((prev) =>
          prev.map((c) =>
            c.caseId.toLowerCase() === response.case_id.toLowerCase()
              ? {
                  ...c,
                  outcome: response.outcome,
                  outcomeRecorded: true,
                  actualResult: response.actual_result,
                  lessonRetained: response.lesson,
                }
              : c
          )
        );

        pushToast(
          'success',
          'Outcome retained in Hindsight',
          `Case ${response.case_id} (${response.outcome}) lesson stored in Hindsight persistent memory.`
        );

        return true;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Backend unavailable — connect FastAPI to run live analysis.';
        setOutcomeError(msg);
        setBackendStatus('disconnected');
        setHindsightStatus('disconnected');
        pushToast('error', 'Outcome Submission Failed', msg);
        return false;
      } finally {
        setIsSubmittingOutcome(false);
      }
    },
    [cases, isSubmittingOutcome, pushToast]
  );

  const syncDemoToHindsight = useCallback(async (): Promise<{
    success: number;
    failed: number;
  }> => {
    if (isSyncingDemoToHindsight) return { success: 0, failed: 0 };
    setIsSyncingDemoToHindsight(true);
    let success = 0;
    let failed = 0;
    const newlySynced: string[] = [];

    for (const demoCase of DEMONSTRATION_CASES) {
      if (!demoCase.lessonRetained) continue;
      try {
        const response = await submitOutcomeToPrecedent(
          {
            caseId: demoCase.caseId,
            outcome: demoCase.outcome === 'WON' ? 'WON' : 'LOST',
            actualResult: demoCase.actualResult || '',
            lesson: demoCase.lessonRetained,
          },
          demoCase.disputeType
        );

        if (response) {
          success++;
          newlySynced.push(demoCase.caseId);
          // Add to retained memories
          setMemories((prev) => {
            const filtered = prev.filter(
              (m) =>
                !(
                  m.sourceType === 'RETAINED IN HINDSIGHT' &&
                  m.caseIdOrigin?.toLowerCase() === response.case_id.toLowerCase()
                )
            );
            return [response.memory_entry, ...filtered];
          });
        }
      } catch {
        failed++;
      }
    }

    setSyncedDemoCaseIds((prev) =>
      Array.from(new Set([...prev, ...newlySynced]))
    );
    setIsSyncingDemoToHindsight(false);

    if (success > 0) {
      setBackendStatus('connected');
      setHindsightStatus('connected');
      pushToast(
        'success',
        'Hindsight Memory Seeded',
        `Retained ${success} historical demonstration precedents into Hindsight persistent memory.`
      );
    } else {
      pushToast(
        'error',
        'Hindsight Seed Failed',
        'Backend unavailable — connect FastAPI to seed demonstration precedents into Hindsight.'
      );
    }

    return { success, failed };
  }, [isSyncingDemoToHindsight, pushToast]);

  const metrics = useMemo<LiveMetrics>(() => {
    const liveCases = cases.filter((c) => !c.isSyntheticDemo);
    const liveOutcomes = outcomes.filter((o) => !o.isSyntheticDemo);

    const casesAnalyzed = liveCases.length;
    const memoriesRecalled = liveCases.reduce(
      (sum, c) => sum + c.analysis.recalled_memories.length,
      0
    );

    // Dynamically calculate total unique precedent Case IDs recalled/retained across live session
    const uniquePrecedentKeys = new Set<string>();
    liveCases.forEach((c) => {
      c.analysis.displayedPrecedents.forEach((p) => {
        uniquePrecedentKeys.add(p.caseId.toUpperCase());
      });
      c.analysis.excludedCurrentCasePrecedents.forEach((p) => {
        uniquePrecedentKeys.add(p.caseId.toUpperCase());
      });
    });
    liveOutcomes.forEach((o) => {
      uniquePrecedentKeys.add(o.caseId.toUpperCase());
    });

    const uniquePrecedents = uniquePrecedentKeys.size;
    const outcomesLearned = liveOutcomes.length;
    const memoryGuidedDecisions = liveCases.filter(
      (c) => c.analysis.memory_used
    ).length;
    const demoCasesCount = cases.filter((c) => Boolean(c.isSyntheticDemo)).length;

    return {
      casesAnalyzed,
      memoriesRecalled,
      uniquePrecedents,
      outcomesLearned,
      memoryGuidedDecisions,
      demoCasesCount,
    };
  }, [cases, outcomes]);

  const setCurrentAnalysisView = useCallback(
    (analysis: CaseAnalysisResult | null, amount = 0) => {
      setCurrentAnalysis(analysis);
      setCurrentDisputeAmount(amount);
    },
    []
  );

  const registerRetainedOutcome = useCallback(
    (outcome: RecordedOutcome) => {
      setOutcomes((prev) => {
        const filtered = prev.filter(
          (o) => o.caseId.toLowerCase() !== outcome.caseId.toLowerCase()
        );
        return [outcome, ...filtered];
      });

      setCases((prev) =>
        prev.map((c) =>
          c.caseId.toLowerCase() === outcome.caseId.toLowerCase()
            ? {
                ...c,
                outcome: outcome.outcome,
                outcomeRecorded: true,
                actualResult: outcome.actualResult,
                lessonRetained: outcome.lesson,
              }
            : c
        )
      );

      const timestampNow =
        outcome.recordedAt ||
        new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

      const newMemory: MemoryEntry = {
        id: `live-ret-${Date.now()}`,
        memoryCode: outcome.caseId.toUpperCase(),
        caseIdOrigin: outcome.caseId.toUpperCase(),
        patternTitle: `${outcome.caseId.toUpperCase()} · ${outcome.disputeType || 'Subscription'}`,
        disputeType: outcome.disputeType || 'Subscription',
        outcomeLearnedFrom: outcome.outcome,
        actualResult: outcome.actualResult,
        lesson: outcome.lesson,
        rawMemories: [outcome.lesson],
        rawMemoryCount: 1,
        relevanceContext: `Retained from ${outcome.outcome} outcome on Case ${outcome.caseId.toUpperCase()}`,
        sourceType: 'RETAINED IN HINDSIGHT',
        timestamp: timestampNow,
      };

      setMemories((prev) => {
        const filtered = prev.filter(
          (m) =>
            !(
              m.sourceType === 'RETAINED IN HINDSIGHT' &&
              m.caseIdOrigin?.toLowerCase() === outcome.caseId.toLowerCase()
            )
        );
        return [newMemory, ...filtered];
      });
    },
    []
  );

  const registerAnalyzedCase = useCallback(
    (result: CaseAnalysisResult, amount = 129.99) => {
      setCurrentAnalysis(result);
      setCurrentDisputeAmount(amount);
      setLastAnalysisAt(result.analyzedAt);

      const newCase: ChargebackCase = {
        id: `case-${Date.now()}`,
        caseId: result.caseId,
        disputeType: 'Subscription',
        amount: amount,
        customerClaim: 'Customer claims cancellation before renewal.',
        merchantEvidence: 'transaction receipt and account activity.',
        decision: result.decision,
        recommendation: result.recommendation,
        confidence: result.confidence,
        outcome: 'PENDING',
        outcomeRecorded: false,
        submittedAt: result.analyzedAt,
        analysis: result,
      };

      setCases((prev) => {
        const existingIndex = prev.findIndex(
          (c) => c.caseId.toLowerCase() === newCase.caseId.toLowerCase()
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...newCase,
            id: prev[existingIndex].id,
            outcome: prev[existingIndex].outcomeRecorded
              ? prev[existingIndex].outcome
              : newCase.outcome,
            outcomeRecorded: prev[existingIndex].outcomeRecorded,
            actualResult:
              prev[existingIndex].actualResult || newCase.actualResult,
            lessonRetained:
              prev[existingIndex].lessonRetained || newCase.lessonRetained,
          };
          return updated;
        }
        return [newCase, ...prev];
      });
    },
    []
  );

  const value = useMemo<PrecedentStoreContextValue>(
    () => ({
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
      clearAnalyzeError: () => setAnalyzeError(null),
      clearOutcomeError: () => setOutcomeError(null),
      setCurrentAnalysisView,
      registerRetainedOutcome,
      registerAnalyzedCase,
    }),
    [
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
      setCurrentAnalysisView,
      registerRetainedOutcome,
      registerAnalyzedCase,
    ]
  );

  return (
    <PrecedentStoreContext.Provider value={value}>
      {children}
    </PrecedentStoreContext.Provider>
  );
};

export function usePrecedentStore(): PrecedentStoreContextValue {
  const ctx = useContext(PrecedentStoreContext);
  if (!ctx) {
    throw new Error(
      'usePrecedentStore must be used inside PrecedentStoreProvider'
    );
  }
  return ctx;
}
