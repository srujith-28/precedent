import { ChargebackCase, RecordedOutcome } from '../types/precedent';
import { buildEvidenceIntelligence } from '../utils/evidenceIntelligence';
import { ConsolidatedPrecedent } from '../utils/precedentConsolidator';

function createDemoPrecedent(params: {
  id: string;
  caseId: string;
  disputeType: string;
  outcome: 'WON' | 'LOST';
  lesson: string;
  timestamp: string;
}): ConsolidatedPrecedent {
  return {
    id: params.id,
    caseId: params.caseId,
    hasReliableCaseId: true,
    disputeType: params.disputeType,
    outcome: params.outcome,
    consolidatedLesson: params.lesson,
    rawMemories: [
      `${params.caseId} [${params.disputeType}] ${params.outcome}: ${params.lesson}`,
    ],
    rawMemoryCount: 1,
    isCurrentCase: false,
    sourceType: 'RECALLED FROM HINDSIGHT',
    timestamp: params.timestamp,
  };
}

/**
 * Controlled synthetic historical demonstration cases.
 * Inspired by real-world chargeback scenarios and card brand network dispute rules.
 * Clearly marked as synthetic / demonstration business cases for evaluating pattern
 * memory and Hindsight precedent recall.
 * Does NOT contain confidential merchant, real customer, or real transaction data.
 */

export const DEMONSTRATION_CASES: ChargebackCase[] = [
  // 1. Subscription cancellation (DEMO-CB-001) - LOST
  (() => {
    const caseId = 'DEMO-CB-001';
    const disputeType = 'Subscription';
    const amount = 89.99;
    const customerClaim =
      'Customer claims they cancelled their monthly software subscription prior to the renewal billing cycle.';
    const merchantEvidence =
      'Generic payment transaction receipt and active account status in billing database. No cancellation timestamp or customer service correspondence on file.';
    const decision: 'FOLD' = 'FOLD';
    const recommendation = 'FOLD';
    const confidence = 82;
    const reasoning =
      'The merchant only has a generic transaction receipt. Under card network rules, in a subscription cancellation dispute, lack of cancellation timestamp records or proof that the account remained active leaves the merchant unable to refute the cardholder claim.';
    const actualResult =
      'Issuer resolved in cardholder favor because merchant could not substantiate cancellation request timing.';
    const lessonRetained =
      'Lost because merchant lacked cancellation request timestamp logs and customer cancellation communication records.';
    const submittedAt = '2026-09-02 10:14:00 UTC';

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: false,
      evidenceToSubmit: ['Generic transaction receipt', 'Billing database record'],
      strongEvidence: ['Transaction receipt'],
      missingEvidence: [
        'Cancellation request timestamp',
        'Customer support communication records',
      ],
      displayedPrecedents: [],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'LOST',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: ['Generic transaction receipt', 'Billing database record'],
        strong_evidence: ['Transaction receipt'],
        weak_evidence: ['Billing database record without cancellation logs'],
        missing_evidence: [
          'Cancellation request timestamp',
          'Customer support communication records',
        ],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: false,
        recalled_memories: [],
        historicalPrecedents: [],
        displayedPrecedents: [],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 0,
        historicalPrecedentsCount: 0,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Baseline evaluation: Recommend folding fee expense due to absence of cancellation timestamp and communication logs.',
        recommendedEvidence: [
          {
            id: 'rec-1',
            label: 'Cancellation request timestamp log',
            category: 'Cancellation Audit',
            strength: 'MISSING',
            status: 'CRITICAL_GAP',
            description: 'Crucial for refuting pre-billing cancellation claim.',
          },
        ],
        hindsightMemoryUsed: [],
        improvedByMemory: false,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 65,
        baseline_reasoning:
          'Baseline analysis solely observes a valid capture transaction receipt without knowing that issuers systematically require cancellation logs.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FOLD',
        hindsight_confidence: 82,
        hindsight_reasoning: reasoning,
      },
    } satisfies ChargebackCase;
  })(),

  // 2. Similar subscription renewal (DEMO-CB-002) - LOST
  (() => {
    const caseId = 'DEMO-CB-002';
    const disputeType = 'Subscription';
    const amount = 149.0;
    const customerClaim =
      'Customer claims annual subscription renewed automatically without prior reminder notice, and merchant refused requested cancellation.';
    const merchantEvidence =
      'Annual renewal invoice and user login log from three months prior. No delivery log for pre-renewal email notice.';
    const decision: 'FOLD' = 'FOLD';
    const recommendation = 'FOLD';
    const confidence = 85;
    const reasoning =
      'Historical precedent DEMO-CB-001 established that subscription disputes fail when communication and cancellation records are absent. Without proof of pre-renewal email delivery, card network regulations mandate cardholder refund.';
    const actualResult =
      'Issuer ruled in cardholder favor due to absent pre-renewal notification delivery audit trail.';
    const lessonRetained =
      'Issuer ruled in cardholder favor because merchant could not produce pre-renewal notification delivery logs or affirmative renewal consent.';
    const submittedAt = '2026-09-08 14:22:00 UTC';

    const displayedPrecedent = createDemoPrecedent({
      id: 'prec-demo-001',
      caseId: 'DEMO-CB-001',
      disputeType: 'Subscription',
      outcome: 'LOST',
      lesson:
        'Lost because merchant lacked cancellation request timestamp logs and customer cancellation communication records.',
      timestamp: '2026-09-02 10:14:00 UTC',
    });

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: true,
      evidenceToSubmit: ['Annual renewal invoice', 'User login log'],
      strongEvidence: ['Annual renewal invoice'],
      weakEvidence: ['User login log from 3 months prior'],
      missingEvidence: [
        'Pre-renewal reminder email delivery log',
        'Explicit renewal consent agreement',
      ],
      displayedPrecedents: [displayedPrecedent],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'LOST',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: ['Annual renewal invoice', 'User login log'],
        strong_evidence: ['Annual renewal invoice'],
        weak_evidence: ['User login log from 3 months prior'],
        missing_evidence: [
          'Pre-renewal reminder email delivery log',
          'Explicit renewal consent agreement',
        ],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: true,
        memory_used_summary:
          'Recalled precedent DEMO-CB-001 demonstrating recurring loss pattern when pre-billing notice or cancellation timestamps are omitted.',
        recalled_memories: [
          'DEMO-CB-001 [Subscription] LOST: Missing cancellation timestamp and customer communication records.',
        ],
        historicalPrecedents: [displayedPrecedent],
        displayedPrecedents: [displayedPrecedent],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 1,
        historicalPrecedentsCount: 1,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Informed by DEMO-CB-001 precedent: Flag missing pre-renewal notification delivery logs as critical defect. Recommend FOLD to prevent dispute fee.',
        recommendedEvidence: [
          {
            id: 'rec-2',
            label: 'Pre-renewal notification email delivery log',
            category: 'Notification Proof',
            strength: 'MISSING',
            status: 'CRITICAL_GAP',
            description: 'Required by Visa/Mastercard subscription compliance guidelines.',
          },
        ],
        hindsightMemoryUsed: [
          {
            id: 'mem-demo-1',
            memoryCode: 'DEMO-CB-001',
            caseIdOrigin: 'DEMO-CB-001',
            patternTitle: 'DEMO-CB-001 · Subscription',
            disputeType: 'Subscription',
            outcomeLearnedFrom: 'LOST',
            actualResult:
              'Issuer resolved in cardholder favor due to lack of cancellation timing logs.',
            lesson:
              'Lost because merchant lacked cancellation request timestamp logs and customer communication records.',
            rawMemories: [
              'DEMO-CB-001 [Subscription] LOST: Missing cancellation timestamp and customer communication.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled prior subscription loss pattern',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-02 10:14:00 UTC',
          },
        ],
        improvedByMemory: true,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 68,
        baseline_reasoning:
          'Baseline evaluation recommended fighting based on the annual renewal invoice and prior login history.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FOLD',
        hindsight_confidence: 85,
        hindsight_reasoning: reasoning,
        previous_outcome: 'LOST',
        relevant_precedent: 'DEMO-CB-001',
        key_lesson:
          'Missing pre-renewal notification delivery audit trail leads to systematic issuer chargeback losses.',
      },
    } satisfies ChargebackCase;
  })(),

  // 3. Merchandise not received (DEMO-CB-003) - LOST
  (() => {
    const caseId = 'DEMO-CB-003';
    const disputeType = 'Product Not Received';
    const amount = 220.0;
    const customerClaim =
      'Cardholder states ordered apparel package never arrived at their residential address.';
    const merchantEvidence =
      'Carrier postal tracking number showing package status as marked delivered in mailbox. No signature and no carrier photo or GPS pin.';
    const decision: 'FOLD' = 'FOLD';
    const recommendation = 'FOLD';
    const confidence = 78;
    const reasoning =
      'Carrier tracking number alone without signature confirmation or carrier GPS coordinates matching the cardholder billing address is consistently rejected by card issuers under Product Not Received rules.';
    const actualResult =
      'Card issuer awarded chargeback to cardholder due to lack of signed or GPS-verified delivery proof.';
    const lessonRetained =
      'Tracking number alone without signature confirmation or carrier GPS coordinates matching the cardholder billing address was deemed insufficient by the card brand.';
    const submittedAt = '2026-09-12 11:05:00 UTC';

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: false,
      evidenceToSubmit: ['Postal carrier tracking number'],
      strongEvidence: ['Tracking number'],
      weakEvidence: ['Unsigned mailbox delivery status'],
      missingEvidence: [
        'Signature proof of delivery',
        'Carrier GPS delivery coordinates',
      ],
      displayedPrecedents: [],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'LOST',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: ['Postal carrier tracking number'],
        strong_evidence: ['Tracking number'],
        weak_evidence: ['Unsigned mailbox delivery status'],
        missing_evidence: [
          'Signature proof of delivery',
          'Carrier GPS delivery coordinates',
        ],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: false,
        recalled_memories: [],
        historicalPrecedents: [],
        displayedPrecedents: [],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 0,
        historicalPrecedentsCount: 0,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Unsigned postal tracking fails issuer threshold for high-value apparel ($220.00). FOLD advised.',
        recommendedEvidence: [
          {
            id: 'rec-3',
            label: 'Carrier Signature Confirmation or GPS Pin',
            category: 'Proof of Delivery',
            strength: 'MISSING',
            status: 'CRITICAL_GAP',
            description: 'Essential for defeating 10.4 Product Not Received chargebacks.',
          },
        ],
        hindsightMemoryUsed: [],
        improvedByMemory: false,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 60,
        baseline_reasoning:
          'Baseline model sees carrier status marked "Delivered" and attempts defense without recognizing missing signature threshold.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FOLD',
        hindsight_confidence: 78,
        hindsight_reasoning: reasoning,
      },
    } satisfies ChargebackCase;
  })(),

  // 4. Merchandise delivery dispute (DEMO-CB-004) - WON
  (() => {
    const caseId = 'DEMO-CB-004';
    const disputeType = 'Product Not Received';
    const amount = 450.0;
    const customerClaim =
      'Customer claims delivered electronics package was stolen from porch and never received.';
    const merchantEvidence =
      'Signed proof of delivery with cardholder signature, carrier photo of dropoff, GPS coordinates matching verified billing address, and order confirmation email.';
    const decision: 'FIGHT' = 'FIGHT';
    const recommendation = 'FIGHT';
    const confidence = 93;
    const reasoning =
      'Merchant possesses the gold standard fulfillment evidence: signature confirmation matching cardholder name and carrier GPS coordinates confirming physical delivery to the billing address, refuting the claim under card network rules.';
    const actualResult =
      'Merchant won representment. Issuer verified signature and carrier GPS delivery proof.';
    const lessonRetained =
      'Signed proof of delivery matching cardholder billing address and carrier GPS dropoff coordinates successfully refuted merchandise-not-received claim.';
    const submittedAt = '2026-09-15 16:30:00 UTC';

    const displayedPrecedent = createDemoPrecedent({
      id: 'prec-demo-003',
      caseId: 'DEMO-CB-003',
      disputeType: 'Product Not Received',
      outcome: 'LOST',
      lesson:
        'Tracking number alone without signature confirmation or carrier GPS coordinates matching the cardholder billing address was deemed insufficient by the card brand.',
      timestamp: '2026-09-12 11:05:00 UTC',
    });

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: true,
      evidenceToSubmit: [
        'Signed proof of delivery',
        'Carrier GPS dropoff coordinates',
        'Carrier photo of package',
        'Order confirmation email',
      ],
      strongEvidence: [
        'Signed proof of delivery',
        'Carrier GPS dropoff coordinates',
        'Order confirmation email',
      ],
      missingEvidence: [],
      displayedPrecedents: [displayedPrecedent],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'WON',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: [
          'Signed proof of delivery',
          'Carrier GPS dropoff coordinates',
          'Carrier photo of package',
          'Order confirmation email',
        ],
        strong_evidence: [
          'Signed proof of delivery',
          'Carrier GPS dropoff coordinates',
          'Order confirmation email',
        ],
        weak_evidence: [],
        missing_evidence: [],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: true,
        memory_used_summary:
          'Recalled DEMO-CB-003 where lack of signed delivery lost the dispute. Confirmed that DEMO-CB-004 possesses the exact signed proof and GPS pin required to win.',
        recalled_memories: [
          'DEMO-CB-003 [Product Not Received] LOST: Tracking number alone without signature or carrier GPS was rejected.',
        ],
        historicalPrecedents: [displayedPrecedent],
        displayedPrecedents: [displayedPrecedent],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 1,
        historicalPrecedentsCount: 1,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Prioritize signed delivery slip and carrier GPS audit log to decisively defeat porch theft claim per card brand representment standards.',
        recommendedEvidence: [
          {
            id: 'rec-4',
            label: 'Submit signed delivery slip prominently as Exhibit A',
            category: 'Representment Submission',
            strength: 'STRONG',
            status: 'RECOMMENDED',
            description: 'Primary defense artifact required by card scheme.',
          },
        ],
        hindsightMemoryUsed: [
          {
            id: 'mem-demo-3',
            memoryCode: 'DEMO-CB-003',
            caseIdOrigin: 'DEMO-CB-003',
            patternTitle: 'DEMO-CB-003 · Product Not Received',
            disputeType: 'Product Not Received',
            outcomeLearnedFrom: 'LOST',
            actualResult: 'Issuer ruled in cardholder favor due to unsigned delivery.',
            lesson:
              'Tracking number alone without signature confirmation or carrier GPS coordinates was rejected.',
            rawMemories: [
              'DEMO-CB-003 [Product Not Received] LOST: Tracking number alone without signature or carrier GPS was rejected.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled prior delivery evidence standard',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-12 11:05:00 UTC',
          },
        ],
        improvedByMemory: true,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 75,
        baseline_reasoning:
          'Baseline model recommends fight based on general order proof.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FIGHT',
        hindsight_confidence: 93,
        hindsight_reasoning: reasoning,
        previous_outcome: 'LOST',
        relevant_precedent: 'DEMO-CB-003',
        key_lesson:
          'Carrier signature matching billing name combined with GPS coordinates shifts liability conclusively back to cardholder.',
      },
    } satisfies ChargebackCase;
  })(),

  // 5. Duplicate transaction (DEMO-CB-005) - WON
  (() => {
    const caseId = 'DEMO-CB-005';
    const disputeType = 'Duplicate Processing';
    const amount = 75.5;
    const customerClaim =
      'Cardholder states their payment card was billed twice for a single gourmet coffee order.';
    const merchantEvidence =
      'Payment gateway authorization logs showing two distinct transaction authorization IDs, separate cart checkout tokens, different SKU contents, and two separate carrier tracking numbers.';
    const decision: 'FIGHT' = 'FIGHT';
    const recommendation = 'FIGHT';
    const confidence = 94;
    const reasoning =
      'Merchant has independent order tokens, distinct transaction authorization numbers, and separate shipment tracking codes proving two separate valid purchases rather than a duplicate processing glitch.';
    const actualResult =
      'Merchant won dispute. Card issuer verified dual distinct order receipts and separate shipment logs.';
    const lessonRetained =
      'Won because independent order IDs, distinct carrier fulfillment tracking numbers, and separate cart timestamps conclusively refuted duplicate processing claim.';
    const submittedAt = '2026-09-18 09:40:00 UTC';

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: false,
      evidenceToSubmit: [
        'Dual payment authorization logs',
        'Distinct cart checkout tokens',
        'Separate shipment tracking numbers',
      ],
      strongEvidence: [
        'Dual payment authorization logs',
        'Separate shipment tracking numbers',
      ],
      missingEvidence: [],
      displayedPrecedents: [],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'WON',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: [
          'Dual payment authorization logs',
          'Distinct cart checkout tokens',
          'Separate shipment tracking numbers',
        ],
        strong_evidence: [
          'Dual payment authorization logs',
          'Separate shipment tracking numbers',
        ],
        weak_evidence: [],
        missing_evidence: [],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: false,
        recalled_memories: [],
        historicalPrecedents: [],
        displayedPrecedents: [],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 0,
        historicalPrecedentsCount: 0,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Present side-by-side comparison of the two unique order authorization IDs and distinct package delivery tracking events.',
        recommendedEvidence: [
          {
            id: 'rec-5',
            label: 'Side-by-side transaction log comparison chart',
            category: 'Transaction Proof',
            strength: 'STRONG',
            status: 'RECOMMENDED',
            description: 'Demonstrates dual unique orders to the issuing bank analyst.',
          },
        ],
        hindsightMemoryUsed: [],
        improvedByMemory: false,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 88,
        baseline_reasoning:
          'Baseline model recognizes two separate orders and recommends defense.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FIGHT',
        hindsight_confidence: 94,
        hindsight_reasoning: reasoning,
      },
    } satisfies ChargebackCase;
  })(),

  // 6. Card-not-present fraud claim (DEMO-CB-006) - LOST
  (() => {
    const caseId = 'DEMO-CB-006';
    const disputeType = 'Fraud';
    const amount = 310.0;
    const customerClaim =
      'Cardholder reported card-not-present unauthorized transaction, asserting their card number was compromised.';
    const merchantEvidence =
      'Standard web checkout receipt with customer name and billing address, but no 3D Secure verification, no device fingerprinting, and no CVV match validation.';
    const decision: 'FOLD' = 'FOLD';
    const recommendation = 'FOLD';
    const confidence = 89;
    const reasoning =
      'In a Card-Not-Present fraud chargeback (Reason Code 10.4 / 4837), without 3D Secure authentication (liability shift) or device binding, card network rules automatically hold the merchant liable.';
    const actualResult =
      'Lost. Issuer confirmed cardholder was not enrolled in 3DS at checkout and merchant lacked liability shift.';
    const lessonRetained =
      'Lost because merchant did not execute 3D Secure (3DS) authentication, failing to shift liability to the card issuer for card-not-present fraud.';
    const submittedAt = '2026-09-21 13:10:00 UTC';

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: false,
      evidenceToSubmit: ['Checkout receipt with billing address'],
      strongEvidence: ['Billing address match'],
      weakEvidence: ['Standard web checkout receipt'],
      missingEvidence: [
        '3D Secure authentication token (Liability Shift)',
        'Device fingerprinting audit log',
        'CVV2 verification record',
      ],
      displayedPrecedents: [],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'LOST',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: ['Checkout receipt with billing address'],
        strong_evidence: ['Billing address match'],
        weak_evidence: ['Standard web checkout receipt'],
        missing_evidence: [
          '3D Secure authentication token (Liability Shift)',
          'Device fingerprinting audit log',
          'CVV2 verification record',
        ],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: false,
        recalled_memories: [],
        historicalPrecedents: [],
        displayedPrecedents: [],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 0,
        historicalPrecedentsCount: 0,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Absence of 3DS liability shift guarantees issuer victory in CNP fraud. Recommend FOLD to save representment fee.',
        recommendedEvidence: [
          {
            id: 'rec-6',
            label: '3D Secure CAVV / ECI Transaction Log',
            category: 'Fraud Liability Shift',
            strength: 'MISSING',
            status: 'CRITICAL_GAP',
            description: 'Crucial for shifting fraud liability to the card issuer.',
          },
        ],
        hindsightMemoryUsed: [],
        improvedByMemory: false,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 58,
        baseline_reasoning:
          'Baseline model attempts to defend based on matching billing address, ignoring card scheme CNP liability rules.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FOLD',
        hindsight_confidence: 89,
        hindsight_reasoning: reasoning,
      },
    } satisfies ChargebackCase;
  })(),

  // 7. Digital-service / refund dispute (DEMO-CB-007) - WON
  (() => {
    const caseId = 'DEMO-CB-007';
    const disputeType = 'Not as Described';
    const amount = 199.0;
    const customerClaim =
      'Customer claims digital analytics software license was non-functional and access was revoked immediately upon payment.';
    const merchantEvidence =
      'Server authentication logs showing 42 hours of active API session usage, 18 report exports, and user IP matching customer billing address location.';
    const decision: 'FIGHT' = 'FIGHT';
    const recommendation = 'FIGHT';
    const confidence = 91;
    const reasoning =
      'Comprehensive digital usage audit logs showing 42 active server sessions and 18 data exports directly refute the claim that the digital software was non-functional or inaccessible.';
    const actualResult =
      'Merchant won dispute. Issuing bank verified active digital consumption audit trail.';
    const lessonRetained =
      'Won because comprehensive digital usage audit logs and export timestamps conclusively refuted the claim that the digital service was unusable or unprovided.';
    const submittedAt = '2026-09-24 15:50:00 UTC';

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: false,
      evidenceToSubmit: [
        'Server authentication logs',
        'API session timestamp history',
        'Report export activity records',
        'User IP to billing geo-match',
      ],
      strongEvidence: [
        'Server authentication logs',
        'Report export activity records',
      ],
      missingEvidence: [],
      displayedPrecedents: [],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'WON',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: [
          'Server authentication logs',
          'API session timestamp history',
          'Report export activity records',
          'User IP to billing geo-match',
        ],
        strong_evidence: [
          'Server authentication logs',
          'Report export activity records',
        ],
        weak_evidence: [],
        missing_evidence: [],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: false,
        recalled_memories: [],
        historicalPrecedents: [],
        displayedPrecedents: [],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 0,
        historicalPrecedentsCount: 0,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Submit chronological API session log and report export receipts as concrete proof of digital service fulfillment.',
        recommendedEvidence: [
          {
            id: 'rec-7',
            label: 'Chronological session usage log with IP geolocation',
            category: 'Digital Service Audit',
            strength: 'STRONG',
            status: 'RECOMMENDED',
            description: 'Refutes non-functional software claims.',
          },
        ],
        hindsightMemoryUsed: [],
        improvedByMemory: false,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 84,
        baseline_reasoning:
          'Baseline model sees active server access logs and recommends defense.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FIGHT',
        hindsight_confidence: 91,
        hindsight_reasoning: reasoning,
      },
    } satisfies ChargebackCase;
  })(),

  // 8. Friendly-fraud / unrecognized transaction (DEMO-CB-008) - WON
  (() => {
    const caseId = 'DEMO-CB-008';
    const disputeType = 'Fraud';
    const amount = 125.0;
    const customerClaim =
      'Cardholder states they do not recognize the merchant company name or transaction amount on their billing statement.';
    const merchantEvidence =
      'Customer profile showing six prior undisputed orders over 18 months, identical hardware device ID, matching shipping address, and loyalty rewards redemption.';
    const decision: 'FIGHT' = 'FIGHT';
    const recommendation = 'FIGHT';
    const confidence = 90;
    const reasoning =
      'Under Compelling Evidence 3.0 rules, established account history showing six prior undisputed transactions with identical device fingerprint and shipping address decisively rebuts an unrecognized transaction claim.';
    const actualResult =
      'Merchant won dispute. Issuer acknowledged cardholder family member transaction after reviewing repeat order history.';
    const lessonRetained =
      'Won under compelling evidence guidelines: repeat customer order history with matching device ID and previous undisputed deliveries defeated unrecognized claim.';
    const submittedAt = '2026-09-27 10:15:00 UTC';

    const displayedPrecedent = createDemoPrecedent({
      id: 'prec-demo-006',
      caseId: 'DEMO-CB-006',
      disputeType: 'Fraud',
      outcome: 'LOST',
      lesson:
        'Lost because merchant did not execute 3D Secure (3DS) authentication, failing to shift liability to the card issuer for card-not-present fraud.',
      timestamp: '2026-09-21 13:10:00 UTC',
    });

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: true,
      evidenceToSubmit: [
        'Historical order ledger (6 previous orders)',
        'Device fingerprint match log',
        'Matching residential shipping address',
        'Loyalty account activity statement',
      ],
      strongEvidence: [
        'Historical order ledger (6 previous orders)',
        'Device fingerprint match log',
      ],
      missingEvidence: [],
      displayedPrecedents: [displayedPrecedent],
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'WON',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: [
          'Historical order ledger (6 previous orders)',
          'Device fingerprint match log',
          'Matching residential shipping address',
          'Loyalty account activity statement',
        ],
        strong_evidence: [
          'Historical order ledger (6 previous orders)',
          'Device fingerprint match log',
        ],
        weak_evidence: [],
        missing_evidence: [],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: true,
        memory_used_summary:
          'Hindsight distinguished first-time stranger fraud (DEMO-CB-006) from repeat-customer friendly fraud, correctly identifying compelling evidence qualification.',
        recalled_memories: [
          'DEMO-CB-006 [Fraud] LOST: Without 3DS or device binding, CNP fraud claims fail.',
        ],
        historicalPrecedents: [displayedPrecedent],
        displayedPrecedents: [displayedPrecedent],
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 1,
        historicalPrecedentsCount: 1,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Package previous 6 order invoices and device fingerprint audit as Visa Compelling Evidence 3.0 defense packet.',
        recommendedEvidence: [
          {
            id: 'rec-8',
            label: 'Visa Compelling Evidence 3.0 Historical Order Dossier',
            category: 'Compelling Evidence',
            strength: 'STRONG',
            status: 'RECOMMENDED',
            description: 'Demonstrates repeat legitimate usage by the cardholder household.',
          },
        ],
        hindsightMemoryUsed: [
          {
            id: 'mem-demo-6',
            memoryCode: 'DEMO-CB-006',
            caseIdOrigin: 'DEMO-CB-006',
            patternTitle: 'DEMO-CB-006 · Fraud',
            disputeType: 'Fraud',
            outcomeLearnedFrom: 'LOST',
            actualResult: 'Lost due to lack of 3DS liability shift.',
            lesson: 'Lack of 3DS liability shift or device binding caused CNP loss.',
            rawMemories: [
              'DEMO-CB-006 [Fraud] LOST: Without 3DS or device binding, CNP fraud claims fail.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled CNP fraud precedent',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-21 13:10:00 UTC',
          },
        ],
        improvedByMemory: true,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 76,
        baseline_reasoning:
          'Baseline model notes prior orders and suggests standard fight response.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FIGHT',
        hindsight_confidence: 90,
        hindsight_reasoning: reasoning,
        previous_outcome: 'LOST',
        relevant_precedent: 'DEMO-CB-006',
        key_lesson:
          'Compelling repeat customer device and address history successfully bypasses first-party unrecognized dispute claims.',
      },
    } satisfies ChargebackCase;
  })(),

  // 9. Subscription cancellation with missing policy evidence (DEMO-CB-009) - LOST
  (() => {
    const caseId = 'DEMO-CB-009';
    const disputeType = 'Subscription';
    const amount = 99.0;
    const customerClaim =
      'Customer claims subscription terms regarding non-refundable renewal were never disclosed or accepted during initial onboarding.';
    const merchantEvidence =
      'Renewal invoice and link to website FAQ terms page. No checkout clickwrap agreement log or checkbox acceptance timestamp.';
    const decision: 'FOLD' = 'FOLD';
    const recommendation = 'FOLD';
    const confidence = 86;
    const reasoning =
      'Recalling precedents DEMO-CB-001 and DEMO-CB-002: in subscription disputes, a generic FAQ link without user-specific checkout clickwrap logs or checkbox timestamps fails card brand disclosure mandates.';
    const actualResult =
      'Issuer decided in cardholder favor due to absence of affirmative terms acceptance at checkout.';
    const lessonRetained =
      'Lost because merchant failed to capture clickwrap terms-of-service acceptance timestamp and explicit checkbox acknowledgement of cancellation policy at checkout.';
    const submittedAt = '2026-09-30 11:20:00 UTC';

    const displayedPrecedents = [
      createDemoPrecedent({
        id: 'prec-demo-001',
        caseId: 'DEMO-CB-001',
        disputeType: 'Subscription',
        outcome: 'LOST',
        lesson:
          'Lost because merchant lacked cancellation request timestamp logs and customer cancellation communication records.',
        timestamp: '2026-09-02 10:14:00 UTC',
      }),
      createDemoPrecedent({
        id: 'prec-demo-002',
        caseId: 'DEMO-CB-002',
        disputeType: 'Subscription',
        outcome: 'LOST',
        lesson:
          'Issuer ruled in cardholder favor because merchant could not produce pre-renewal notification delivery logs or affirmative renewal consent.',
        timestamp: '2026-09-08 14:22:00 UTC',
      }),
    ];

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: true,
      evidenceToSubmit: ['Renewal invoice', 'Website FAQ terms URL'],
      strongEvidence: ['Renewal invoice'],
      weakEvidence: ['Generic website FAQ link'],
      missingEvidence: [
        'Checkout clickwrap acceptance timestamp log',
        'Specific cancellation policy disclosure checkbox',
      ],
      displayedPrecedents,
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'LOST',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: ['Renewal invoice', 'Website FAQ terms URL'],
        strong_evidence: ['Renewal invoice'],
        weak_evidence: ['Generic website FAQ link'],
        missing_evidence: [
          'Checkout clickwrap acceptance timestamp log',
          'Specific cancellation policy disclosure checkbox',
        ],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: true,
        memory_used_summary:
          'Recalled DEMO-CB-001 & DEMO-CB-002. Reaffirmed recurring evidence gap: lack of verifiable checkout terms acceptance leaves merchant unprotected.',
        recalled_memories: [
          'DEMO-CB-001 [Subscription] LOST: Missing cancellation timestamp and customer communication.',
          'DEMO-CB-002 [Subscription] LOST: Missing pre-renewal notification delivery logs.',
        ],
        historicalPrecedents: displayedPrecedents,
        displayedPrecedents,
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 2,
        historicalPrecedentsCount: 2,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Hindsight precedent indicates that general website terms without user-level clickwrap audit are rejected. FOLD recommended.',
        recommendedEvidence: [
          {
            id: 'rec-9',
            label: 'Checkout clickwrap audit log with user IP and timestamp',
            category: 'Disclosure Compliance',
            strength: 'MISSING',
            status: 'CRITICAL_GAP',
            description: 'Strictly required by Visa/Mastercard subscription disclosure rules.',
          },
        ],
        hindsightMemoryUsed: [
          {
            id: 'mem-demo-1',
            memoryCode: 'DEMO-CB-001',
            caseIdOrigin: 'DEMO-CB-001',
            patternTitle: 'DEMO-CB-001 · Subscription',
            disputeType: 'Subscription',
            outcomeLearnedFrom: 'LOST',
            actualResult: 'Lost due to lack of cancellation logs.',
            lesson: 'Missing cancellation timestamp logs and communication records.',
            rawMemories: [
              'DEMO-CB-001 [Subscription] LOST: Missing cancellation timestamp and communication.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled subscription loss precedent',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-02 10:14:00 UTC',
          },
          {
            id: 'mem-demo-2',
            memoryCode: 'DEMO-CB-002',
            caseIdOrigin: 'DEMO-CB-002',
            patternTitle: 'DEMO-CB-002 · Subscription',
            disputeType: 'Subscription',
            outcomeLearnedFrom: 'LOST',
            actualResult: 'Lost due to lack of pre-renewal notification.',
            lesson: 'Missing pre-renewal notification delivery logs.',
            rawMemories: [
              'DEMO-CB-002 [Subscription] LOST: Missing pre-renewal notification delivery logs.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled subscription renewal precedent',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-08 14:22:00 UTC',
          },
        ],
        improvedByMemory: true,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FIGHT',
        baseline_confidence: 62,
        baseline_reasoning:
          'Baseline model sees active terms on website and suggests fighting.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FOLD',
        hindsight_confidence: 86,
        hindsight_reasoning: reasoning,
        previous_outcome: 'LOST',
        relevant_precedent: 'DEMO-CB-001, DEMO-CB-002',
        key_lesson:
          'Checkout clickwrap logs with specific checkbox acknowledgement are mandatory for subscription defenses.',
      },
    } satisfies ChargebackCase;
  })(),

  // 10. A later case similar to earlier cases demonstrating the complete learning loop (DEMO-CB-010) - WON
  (() => {
    const caseId = 'DEMO-CB-010';
    const disputeType = 'Subscription';
    const amount = 119.0;
    const customerClaim =
      'Customer claims monthly subscription renewal was unauthorized and merchant refused cancellation request.';
    const merchantEvidence =
      'Complete evidence trinity: Checkout clickwrap terms acceptance log with timestamp and customer IP, 7-day pre-renewal notification email delivery log with open timestamp, and billing server audit confirming no cancellation was requested prior to billing cycle.';
    const decision: 'FIGHT' = 'FIGHT';
    const recommendation = 'FIGHT';
    const confidence = 93;
    const reasoning =
      'Precedent learning loop demonstrated: Merchant successfully resolved historical evidence gaps identified in DEMO-CB-001, DEMO-CB-002, and DEMO-CB-009 by submitting clickwrap terms acceptance, pre-renewal notification logs, and cancellation timestamp records, securing a high-confidence FIGHT recommendation.';
    const actualResult =
      'Merchant won dispute. Card issuer upheld transaction following review of complete subscription audit trail.';
    const lessonRetained =
      'Precedent learning loop succeeded: Merchant corrected past evidence gaps by submitting full evidence trinity (checkout terms agreement, pre-renewal reminder log, and cancellation timestamp audit), successfully winning the subscription dispute.';
    const submittedAt = '2026-10-04 14:05:00 UTC';

    const displayedPrecedents = [
      createDemoPrecedent({
        id: 'prec-demo-001',
        caseId: 'DEMO-CB-001',
        disputeType: 'Subscription',
        outcome: 'LOST',
        lesson:
          'Lost because merchant lacked cancellation request timestamp logs and customer cancellation communication records.',
        timestamp: '2026-09-02 10:14:00 UTC',
      }),
      createDemoPrecedent({
        id: 'prec-demo-009',
        caseId: 'DEMO-CB-009',
        disputeType: 'Subscription',
        outcome: 'LOST',
        lesson:
          'Lost because merchant failed to capture clickwrap terms-of-service acceptance timestamp and explicit checkbox acknowledgement of cancellation policy at checkout.',
        timestamp: '2026-09-30 11:20:00 UTC',
      }),
    ];

    const evidenceIntel = buildEvidenceIntelligence({
      caseId,
      disputeType,
      merchantEvidence,
      reasoning,
      memoryUsed: true,
      evidenceToSubmit: [
        'Checkout clickwrap agreement timestamp log',
        '7-day pre-renewal notification email delivery log',
        'Customer support portal log confirming zero pre-billing cancellation requests',
      ],
      strongEvidence: [
        'Checkout clickwrap agreement timestamp log',
        '7-day pre-renewal notification email delivery log',
        'Customer support portal log confirming zero pre-billing cancellation requests',
      ],
      missingEvidence: [],
      displayedPrecedents,
      excludedCurrentCasePrecedents: [],
    });

    return {
      id: `demo-${caseId}`,
      caseId,
      disputeType,
      amount,
      customerClaim,
      merchantEvidence,
      decision,
      recommendation,
      confidence,
      outcome: 'WON',
      outcomeRecorded: true,
      actualResult,
      lessonRetained,
      submittedAt,
      isSyntheticDemo: true,
      analysis: {
        caseId,
        disputeType,
        customerClaim,
        merchantEvidence,
        decision,
        recommendation,
        confidence,
        evidence_to_submit: [
          'Checkout clickwrap agreement timestamp log',
          '7-day pre-renewal notification email delivery log',
          'Customer support portal log confirming zero pre-billing cancellation requests',
        ],
        strong_evidence: [
          'Checkout clickwrap agreement timestamp log',
          '7-day pre-renewal notification email delivery log',
          'Customer support portal log confirming zero pre-billing cancellation requests',
        ],
        weak_evidence: [],
        missing_evidence: [],
        hasExplicitEvidenceCategories: true,
        reasoning,
        memory_used: true,
        memory_used_summary:
          'Learning Loop Complete: Recalled recurring gaps from DEMO-CB-001 and DEMO-CB-009. Verified that merchant has now fulfilled all required evidence standards, reversing the previous FOLD decision to a winning FIGHT outcome.',
        recalled_memories: [
          'DEMO-CB-001 [Subscription] LOST: Missing cancellation timestamp and communication records.',
          'DEMO-CB-009 [Subscription] LOST: Missing checkout clickwrap terms acceptance log.',
        ],
        historicalPrecedents: displayedPrecedents,
        displayedPrecedents,
        excludedCurrentCasePrecedents: [],
        uniquePrecedentsCount: 2,
        historicalPrecedentsCount: 2,
        evidenceIntelligence: evidenceIntel,
        evidence_strategy:
          'Present the three pillars: (1) Checkout clickwrap acceptance timestamp, (2) Pre-billing notice delivery log, and (3) Post-renewal cancellation record.',
        recommendedEvidence: [
          {
            id: 'rec-10',
            label: 'Submit three-pillar evidence pack per Hindsight learning model',
            category: 'Evidence Trinity',
            strength: 'STRONG',
            status: 'RECOMMENDED',
            description: 'Conclusively addresses all known issuer objection vectors.',
          },
        ],
        hindsightMemoryUsed: [
          {
            id: 'mem-demo-1',
            memoryCode: 'DEMO-CB-001',
            caseIdOrigin: 'DEMO-CB-001',
            patternTitle: 'DEMO-CB-001 · Subscription',
            disputeType: 'Subscription',
            outcomeLearnedFrom: 'LOST',
            actualResult: 'Lost due to lack of cancellation logs.',
            lesson: 'Missing cancellation timestamp logs and customer communication.',
            rawMemories: [
              'DEMO-CB-001 [Subscription] LOST: Missing cancellation timestamp and communication.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled subscription cancellation precedent',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-02 10:14:00 UTC',
          },
          {
            id: 'mem-demo-9',
            memoryCode: 'DEMO-CB-009',
            caseIdOrigin: 'DEMO-CB-009',
            patternTitle: 'DEMO-CB-009 · Subscription',
            disputeType: 'Subscription',
            outcomeLearnedFrom: 'LOST',
            actualResult: 'Lost due to lack of checkout terms clickwrap acceptance.',
            lesson: 'Missing clickwrap terms-of-service acceptance timestamp at checkout.',
            rawMemories: [
              'DEMO-CB-009 [Subscription] LOST: Missing checkout clickwrap terms acceptance log.',
            ],
            rawMemoryCount: 1,
            relevanceContext: 'Recalled subscription terms precedent',
            sourceType: 'RECALLED FROM HINDSIGHT',
            timestamp: '2026-09-30 11:20:00 UTC',
          },
        ],
        improvedByMemory: true,
        analyzedAt: submittedAt,
        baseline_recommendation: 'FOLD',
        baseline_confidence: 65,
        baseline_reasoning:
          'Standard baseline model without memory might treat subscription disputes pessimistically.',
        baseline_comparison_status: 'available',
        hindsight_recommendation: 'FIGHT',
        hindsight_confidence: 93,
        hindsight_reasoning: reasoning,
        previous_outcome: 'LOST',
        relevant_precedent: 'DEMO-CB-001, DEMO-CB-009',
        key_lesson:
          'Full evidence trinity (clickwrap terms, pre-renewal reminder, and cancellation timestamp log) successfully turns subscription disputes from LOST to WON.',
      },
    } satisfies ChargebackCase;
  })(),
];

/**
 * Pre-extracted outcomes for the synthetic demonstration cases.
 */
export const DEMONSTRATION_OUTCOMES: RecordedOutcome[] = DEMONSTRATION_CASES.map(
  (c) => ({
    id: `out-${c.id}`,
    caseId: c.caseId,
    disputeType: c.disputeType,
    predictedRecommendation: c.decision,
    outcome: (c.outcome === 'WON' ? 'WON' : 'LOST') as 'WON' | 'LOST',
    actualResult: c.actualResult || '',
    lesson: c.lessonRetained || '',
    recordedAt: c.submittedAt,
    isSyntheticDemo: true,
  })
);
