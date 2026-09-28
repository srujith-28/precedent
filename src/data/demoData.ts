import {
  ChargebackCase,
  MemoryEntry,
  CaseFormInput,
  OutcomeFormInput,
} from '../types/precedent';

export const DISPUTE_TYPES = [
  { value: 'Subscription', label: 'Subscription' },
  { value: 'Fraud', label: 'Fraud' },
  { value: 'Product Not Received', label: 'Product Not Received' },
  { value: 'Not as Described', label: 'Not as Described' },
  { value: 'Duplicate Processing', label: 'Duplicate Processing' },
] as const;

export const INITIAL_MEMORIES: MemoryEntry[] = [
  {
    id: 'demo-mem-cb001',
    memoryCode: 'CB-001',
    caseIdOrigin: 'CB-001',
    patternTitle: 'CB-001 — Subscription Cancellation Before Renewal ($89.99)',
    disputeType: 'Subscription',
    outcomeLearnedFrom: 'LOST',
    actualResult:
      'Merchant submitted only a generic transaction receipt and account activity. Dispute was LOST.',
    lesson:
      'The merchant lost because cancellation records and customer communication were missing.',
    recommendedAction:
      'When analyzing future Subscription disputes (like CB-002), require cancellation records and customer communication alongside the transaction receipt.',
    recalledCount: 1,
    casesImprovedCount: 1,
    lastUpdated: 'Demo Walkthrough',
    isDemo: true,
  },
];

export const INITIAL_CASES: ChargebackCase[] = [
  {
    id: 'demo-case-cb001',
    caseId: 'CB-001',
    disputeType: 'Subscription',
    amount: 89.99,
    customerClaim: 'Customer claims cancellation before renewal.',
    merchantEvidence: 'generic transaction receipt and account activity.',
    decision: 'FIGHT',
    confidence: 60,
    outcome: 'LOST',
    actualResult:
      'Dispute was lost because generic transaction receipt and account activity did not disprove pre-renewal cancellation.',
    lessonRetained:
      'The merchant lost because cancellation records and customer communication were missing.',
    submittedAt: 'Demo Step 1 (Prior Case)',
    isDemo: true,
    analysis: {
      caseId: 'CB-001',
      decision: 'FIGHT',
      recommendation: 'FIGHT',
      confidence: 60,
      evidence_to_submit: [
        'Generic transaction receipt',
        'Account activity log',
      ],
      reasoning:
        'Evaluated prior to Hindsight retention. Merchant submitted only a generic transaction receipt and account activity. Outcome was LOST and retained into Hindsight with lesson: "The merchant lost because cancellation records and customer communication were missing."',
      memory_used: false,
      recalled_memories: [],
      recommendedEvidence: [
        {
          id: 'ev-cb001-1',
          label: 'Generic transaction receipt and account activity',
          category: 'evidence_to_submit',
          status: 'PRESENT',
          description:
            'Submitted in CB-001; resulted in LOST outcome because cancellation records and customer communication were missing.',
          isDemo: true,
        },
      ],
      hindsightMemoryUsed: [],
      improvedByMemory: false,
      analyzedAt: 'Demo Case CB-001',
      isDemo: true,
    },
  },
  {
    id: 'demo-case-cb002',
    caseId: 'CB-002',
    disputeType: 'Subscription',
    amount: 129.99,
    customerClaim: 'Customer claims cancellation before renewal.',
    merchantEvidence: 'transaction receipt and account activity.',
    decision: 'FOLD',
    confidence: 88,
    outcome: 'PENDING',
    actualResult:
      'Recalled CB-001 memory during analysis, which directly influenced the recommended evidence to require cancellation records and customer communication.',
    lessonRetained:
      'The merchant lost because cancellation records and customer communication were missing.',
    submittedAt: 'Demo Step 2 (Recalls CB-001)',
    isDemo: true,
    analysis: {
      caseId: 'CB-002',
      decision: 'FOLD',
      recommendation: 'FOLD (or attach cancellation records & customer communication before fighting)',
      confidence: 88,
      evidence_to_submit: [
        'Cancellation records proving no cancellation occurred before renewal',
        'Customer communication logs (pre-renewal notice & support history)',
        'Transaction receipt and account activity',
      ],
      reasoning:
        'Hindsight recalled CB-001 ($89.99 Subscription dispute, Outcome: LOST, Lesson: "The merchant lost because cancellation records and customer communication were missing."). Because CB-002 has the same claim ("Customer claims cancellation before renewal.") and only provides "transaction receipt and account activity.", the recalled CB-001 memory directly influenced the recommended evidence to require cancellation records and customer communication.',
      memory_used: true,
      recalled_memories: [
        'CB-001 (Subscription, $89.99, Outcome: LOST) — Lesson: "The merchant lost because cancellation records and customer communication were missing."',
      ],
      recommendedEvidence: [
        {
          id: 'ev-cb002-1',
          label: 'Cancellation records proving status prior to renewal',
          category: 'Influenced by Recalled CB-001 Memory',
          status: 'CRITICAL_GAP',
          description:
            'Added to evidence_to_submit because Hindsight recalled CB-001 ("The merchant lost because cancellation records and customer communication were missing.").',
          isDemo: true,
        },
        {
          id: 'ev-cb002-2',
          label: 'Customer communication records & renewal disclosures',
          category: 'Influenced by Recalled CB-001 Memory',
          status: 'CRITICAL_GAP',
          description:
            'Required based on recalled CB-001 outcome to prove the customer was notified and did not cancel before renewal.',
          isDemo: true,
        },
        {
          id: 'ev-cb002-3',
          label: 'Transaction receipt and account activity',
          category: 'Merchant Evidence Provided',
          status: 'PRESENT',
          description:
            'Insufficient on its own per CB-001 Hindsight memory; must be paired with cancellation records and customer communication.',
          isDemo: true,
        },
      ],
      hindsightMemoryUsed: [INITIAL_MEMORIES[0]],
      improvedByMemory: true,
      analyzedAt: 'Demo Case CB-002',
      isDemo: true,
    },
  },
];

export const DEFAULT_ANALYZE_INPUT: CaseFormInput = {
  caseId: 'CB-002',
  disputeType: 'Subscription',
  amount: '129.99',
  customerClaim: 'Customer claims cancellation before renewal.',
  merchantEvidence: 'transaction receipt and account activity.',
};

export const DEFAULT_OUTCOME_INPUT: OutcomeFormInput = {
  caseId: 'CB-001',
  outcome: 'LOST',
  actualResult:
    'Customer claimed cancellation before renewal on $89.99 Subscription; merchant only submitted generic transaction receipt and account activity.',
  lesson:
    'The merchant lost because cancellation records and customer communication were missing.',
};

export const PRESET_TEST_CASES: {
  label: string;
  tag: string;
  data: CaseFormInput;
}[] = [
  {
    label: 'CB-001: Subscription ($89.99)',
    tag: 'Demo Case 1',
    data: {
      caseId: 'CB-001',
      disputeType: 'Subscription',
      amount: '89.99',
      customerClaim: 'Customer claims cancellation before renewal.',
      merchantEvidence: 'generic transaction receipt and account activity.',
    },
  },
  {
    label: 'CB-002: Subscription ($129.99)',
    tag: 'Demo Case 2 (Recalls CB-001)',
    data: {
      caseId: 'CB-002',
      disputeType: 'Subscription',
      amount: '129.99',
      customerClaim: 'Customer claims cancellation before renewal.',
      merchantEvidence: 'transaction receipt and account activity.',
    },
  },
];
