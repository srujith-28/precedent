import { CaseAnalysisResult } from './precedent';

export type StripeDisputeReason =
  | 'fraudulent'
  | 'unrecognized'
  | 'subscription_canceled'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'duplicate'
  | 'credit_not_processed'
  | 'general';

export type StripeDisputeStatus =
  | 'warning_needs_response'
  | 'needs_response'
  | 'under_review'
  | 'won'
  | 'lost'
  | 'charge_refunded';

export interface StripeConnectedEvidence {
  card_brand?: string;
  card_last4?: string;
  card_funding?: string;
  card_country?: string;
  billing_postal_code?: string;
  avs_postal_match?: boolean;
  cvc_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked';
  customer_email?: string;
  customer_name?: string;
  customer_purchase_ip?: string;
  receipt_url?: string;
  payment_created?: number;
  product_description?: string;
  subscription_interval?: string;
  service_start_date?: string;
  prior_transactions_count?: number;
  radar_risk_score?: number;
  radar_risk_level?: 'normal' | 'elevated' | 'highest' | 'not_assessed';
}

export interface StripeDispute {
  id: string; // e.g. dp_1P001
  amount: number; // e.g. 149.00
  amount_cents: number;
  currency: string;
  reason: StripeDisputeReason;
  status: StripeDisputeStatus;
  created: number; // Unix timestamp
  evidence_due_by: number; // Unix timestamp
  charge_id: string;
  payment_intent_id?: string;
  is_sandbox: boolean;
  customer_claim: string;
  connected_evidence: StripeConnectedEvidence;
  missing_evidence_from_sources: string[];
  merchant_supplied_evidence?: string;
  represented: boolean;
  represented_at?: string;
  outcome_recorded: boolean;
  final_outcome?: 'won' | 'lost';
  actual_result?: string;
  lesson_learned?: string;
  hindsight_analysis?: CaseAnalysisResult | null;
}

export interface StripePayment {
  id: string; // e.g. pi_3P001
  amount: number;
  amount_cents: number;
  currency: string;
  status:
    | 'succeeded'
    | 'requires_payment_method'
    | 'requires_action'
    | 'canceled'
    | 'failed';
  created: number;
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  description?: string;
  receipt_url?: string;
  card_brand?: string;
  card_last4?: string;
  disputed: boolean;
  dispute_id?: string;
  radar_risk_score?: number;
  radar_risk_level?: 'normal' | 'elevated' | 'highest' | 'not_assessed';
  is_sandbox: boolean;
}

export interface StripeStatus {
  connected: boolean;
  mode: 'test_live_key' | 'test_sandbox_fallback' | 'unconfigured';
  livemode: false;
  secret_key_configured: boolean;
  webhook_secret_configured: boolean;
  key_prefix?: string; // e.g. sk_test_...
  total_payments: number;
  total_disputes: number;
  needs_response_count: number;
  webhook_events_count: number;
  message?: string;
}

export interface StripeWebhookEvent {
  id: string; // e.g. evt_1P...
  type: string; // e.g. charge.dispute.created, payment_intent.succeeded
  created: number;
  livemode: false;
  verified: boolean;
  signature_checked: boolean;
  status: 'processed' | 'skipped_duplicate' | 'failed';
  summary: string;
  data_object_id: string;
}
