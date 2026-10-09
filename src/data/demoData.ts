import { CaseFormInput, OutcomeFormInput } from '../types/precedent';

export const DISPUTE_TYPES = [
  { value: 'Subscription', label: 'Subscription' },
  { value: 'Fraud', label: 'Fraud' },
  { value: 'Product Not Received', label: 'Product Not Received' },
  { value: 'Not as Described', label: 'Not as Described' },
  { value: 'Duplicate Processing', label: 'Duplicate Processing' },
] as const;

export const EMPTY_ANALYZE_INPUT: CaseFormInput = {
  caseId: 'CB-001',
  disputeType: 'Subscription',
  amount: '',
  customerClaim: '',
  merchantEvidence: '',
};

export const EMPTY_OUTCOME_INPUT: OutcomeFormInput = {
  caseId: '',
  outcome: 'LOST',
  actualResult: '',
  lesson: '',
};

/**
 * Generates a sensible next sequential Case ID (e.g. CB-001 -> CB-002 -> CB-003)
 * based on existing analyzed Case IDs and the current Case ID input.
 */
export function computeNextCaseId(
  currentCaseId: string,
  existingCaseIds: string[]
): string {
  const allIds = [currentCaseId, ...existingCaseIds].filter(Boolean);
  let maxNum = 0;
  let prefix = 'CB-';
  let padLen = 3;

  for (const rawId of allIds) {
    const match = rawId.trim().match(/^([A-Za-z]+-)(\d+)$/);
    if (match) {
      prefix = match[1].toUpperCase();
      padLen = Math.max(padLen, match[2].length);
      const num = parseInt(match[2], 10);
      if (!Number.isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(padLen, '0')}`;
}

/**
 * Form input helpers to populate the intake form fields for live API testing
 * without pre-populating any fake analysis results.
 */
export const INTAKE_EXAMPLES: {
  label: string;
  tag: string;
  data: CaseFormInput;
}[] = [
  {
    label: 'CB-001: Subscription ($89.99)',
    tag: 'Step 1: Initial Case',
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
    tag: 'Step 3: Recalls CB-001',
    data: {
      caseId: 'CB-002',
      disputeType: 'Subscription',
      amount: '129.99',
      customerClaim: 'Customer claims cancellation before renewal.',
      merchantEvidence: 'transaction receipt and account activity.',
    },
  },
  {
    label: 'CB-003: Subscription ($149.00)',
    tag: 'Follow-Up Case',
    data: {
      caseId: 'CB-003',
      disputeType: 'Subscription',
      amount: '149.00',
      customerClaim:
        'Customer says they cancelled their annual plan prior to billing date.',
      merchantEvidence:
        'Transaction receipt, account login logs, and cancellation policy terms.',
    },
  },
];

export const OUTCOME_EXAMPLES: {
  label: string;
  data: OutcomeFormInput;
}[] = [
  {
    label: 'CB-001 LOST Outcome Template',
    data: {
      caseId: 'CB-001',
      outcome: 'LOST',
      actualResult:
        'The chargeback was lost because the merchant could not prove cancellation before renewal.',
      lesson:
        'The merchant lost because cancellation records and customer communication were missing.',
    },
  },
];

/**
 * Synthetic demonstration business case intake presets.
 * Populates form inputs with one of the 10 real-world inspired demonstration scenarios
 * to test live API analysis against Hindsight persistent memory.
 */
export const DEMO_INTAKE_TEMPLATES: {
  label: string;
  scenario: string;
  tag: string;
  data: CaseFormInput;
}[] = [
  {
    label: 'DEMO-CB-001: Subscription Cancellation ($89.99)',
    scenario: '1. Subscription cancellation',
    tag: 'Baseline Loss Precedent',
    data: {
      caseId: 'DEMO-CB-001',
      disputeType: 'Subscription',
      amount: '89.99',
      customerClaim:
        'Customer claims they cancelled their monthly software subscription prior to the renewal billing cycle.',
      merchantEvidence:
        'Generic payment transaction receipt and active account status in billing database. No cancellation timestamp or customer service correspondence on file.',
    },
  },
  {
    label: 'DEMO-CB-002: Similar Subscription Renewal ($149.00)',
    scenario: '2. Similar subscription renewal',
    tag: 'Recalls DEMO-CB-001',
    data: {
      caseId: 'DEMO-CB-002',
      disputeType: 'Subscription',
      amount: '149.00',
      customerClaim:
        'Customer claims annual subscription renewed automatically without prior reminder notice, and merchant refused requested cancellation.',
      merchantEvidence:
        'Annual renewal invoice and user login log from three months prior. No delivery log for pre-renewal email notice.',
    },
  },
  {
    label: 'DEMO-CB-003: Merchandise Not Received ($220.00)',
    scenario: '3. Merchandise not received',
    tag: 'Unsigned Tracking Gap',
    data: {
      caseId: 'DEMO-CB-003',
      disputeType: 'Product Not Received',
      amount: '220.00',
      customerClaim:
        'Cardholder states ordered apparel package never arrived at their residential address.',
      merchantEvidence:
        'Carrier postal tracking number showing package status as marked delivered in mailbox. No signature and no carrier photo or GPS pin.',
    },
  },
  {
    label: 'DEMO-CB-004: Merchandise Delivery Dispute ($450.00)',
    scenario: '4. Merchandise delivery dispute',
    tag: 'Signed & GPS Delivery',
    data: {
      caseId: 'DEMO-CB-004',
      disputeType: 'Product Not Received',
      amount: '450.00',
      customerClaim:
        'Customer claims delivered electronics package was stolen from porch and never received.',
      merchantEvidence:
        'Signed proof of delivery with cardholder signature, carrier photo of dropoff, GPS coordinates matching verified billing address, and order confirmation email.',
    },
  },
  {
    label: 'DEMO-CB-005: Duplicate Transaction ($75.50)',
    scenario: '5. Duplicate transaction',
    tag: 'Dual Order Authorization',
    data: {
      caseId: 'DEMO-CB-005',
      disputeType: 'Duplicate Processing',
      amount: '75.50',
      customerClaim:
        'Cardholder states their payment card was billed twice for a single gourmet coffee order.',
      merchantEvidence:
        'Payment gateway authorization logs showing two distinct transaction authorization IDs, separate cart checkout tokens, different SKU contents, and two separate carrier tracking numbers.',
    },
  },
  {
    label: 'DEMO-CB-006: Card-Not-Present Fraud Claim ($310.00)',
    scenario: '6. Card-not-present fraud claim',
    tag: 'CNP Without 3DS',
    data: {
      caseId: 'DEMO-CB-006',
      disputeType: 'Fraud',
      amount: '310.00',
      customerClaim:
        'Cardholder reported card-not-present unauthorized transaction, asserting their card number was compromised.',
      merchantEvidence:
        'Standard web checkout receipt with customer name and billing address, but no 3D Secure verification, no device fingerprinting, and no CVV match validation.',
    },
  },
  {
    label: 'DEMO-CB-007: Digital Service Refund Dispute ($199.00)',
    scenario: '7. Digital-service / refund dispute',
    tag: 'API Server Access Audit',
    data: {
      caseId: 'DEMO-CB-007',
      disputeType: 'Not as Described',
      amount: '199.00',
      customerClaim:
        'Customer claims digital analytics software license was non-functional and access was revoked immediately upon payment.',
      merchantEvidence:
        'Server authentication logs showing 42 hours of active API session usage, 18 report exports, and user IP matching customer billing address location.',
    },
  },
  {
    label: 'DEMO-CB-008: Friendly Fraud / Unrecognized Charge ($125.00)',
    scenario: '8. Friendly-fraud / unrecognized transaction',
    tag: 'Compelling Evidence 3.0',
    data: {
      caseId: 'DEMO-CB-008',
      disputeType: 'Fraud',
      amount: '125.00',
      customerClaim:
        'Cardholder states they do not recognize the merchant company name or transaction amount on their billing statement.',
      merchantEvidence:
        'Customer profile showing six prior undisputed orders over 18 months, identical hardware device ID, matching shipping address, and loyalty rewards redemption.',
    },
  },
  {
    label: 'DEMO-CB-009: Subscription Missing Policy Clickwrap ($99.00)',
    scenario: '9. Subscription cancellation with missing policy evidence',
    tag: 'Missing Clickwrap Gap',
    data: {
      caseId: 'DEMO-CB-009',
      disputeType: 'Subscription',
      amount: '99.00',
      customerClaim:
        'Customer claims subscription terms regarding non-refundable renewal were never disclosed or accepted during initial onboarding.',
      merchantEvidence:
        'Renewal invoice and link to website FAQ terms page. No checkout clickwrap agreement log or checkbox acceptance timestamp.',
    },
  },
  {
    label: 'DEMO-CB-010: Complete Evidence Trinity Resolution ($119.00)',
    scenario: '10. Later case completing learning loop',
    tag: 'Learning Loop Complete (FIGHT)',
    data: {
      caseId: 'DEMO-CB-010',
      disputeType: 'Subscription',
      amount: '119.00',
      customerClaim:
        'Customer claims monthly subscription renewal was unauthorized and merchant refused cancellation request.',
      merchantEvidence:
        'Complete evidence trinity: Checkout clickwrap terms acceptance log with timestamp and customer IP, 7-day pre-renewal notification email delivery log with open timestamp, and billing server audit confirming no cancellation was requested prior to billing cycle.',
    },
  },
];
