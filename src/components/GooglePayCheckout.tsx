import React, { useEffect, useMemo, useState } from 'react';
import {
  loadStripe,
  StripeElementsOptions,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
} from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import {
  createPaymentIntent,
  CreatePaymentIntentResponse,
  fetchPaymentIntentStatus,
  fetchStripeConfig,
  getFrontendStripePublishableKey,
  PaymentIntentStatusResponse,
  StripeConfigResponse,
} from '../services/stripeApi';
import { NavigationTab } from '../types/precedent';

export interface GooglePayCheckoutProps {
  onNavigateTab: (tab: NavigationTab) => void;
  onPaymentCompleted?: (paymentId: string) => void;
  variant?: 'page' | 'dashboard';
}

export interface ProductPreset {
  id: string;
  name: string;
  description: string;
  amount: number;
  amountCents: number;
  disputeRiskCategory: 'Subscription' | 'Product Not Received' | 'Fraud';
  tag: string;
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  {
    id: 'prod_sub_renewal',
    name: 'CloudPro Annual SaaS Tier',
    description: 'Yearly enterprise recurring software license with automated renewal',
    amount: 149.0,
    amountCents: 14900,
    disputeRiskCategory: 'Subscription',
    tag: 'Subscription Billing',
  },
  {
    id: 'prod_hardware_key',
    name: 'Hardware Security Key (2x)',
    description: 'Physical enterprise FIDO2 security token hardware delivery',
    amount: 420.0,
    amountCents: 42000,
    disputeRiskCategory: 'Product Not Received',
    tag: 'Physical Goods Delivery',
  },
  {
    id: 'prod_workspace_seat',
    name: 'API Add-on License Tier',
    description: 'Developer workspace seat allocation and cloud token credits',
    amount: 89.0,
    amountCents: 8900,
    disputeRiskCategory: 'Fraud',
    tag: 'Digital License',
  },
];

interface InnerCheckoutProps {
  config: StripeConfigResponse | null;
  publishableKey: string;
  selectedPreset: ProductPreset;
  setSelectedPreset: (p: ProductPreset) => void;
  customAmount: string;
  setCustomAmount: (val: string) => void;
  isCustom: boolean;
  setIsCustom: (val: boolean) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerEmail: string;
  setCustomerEmail: (val: string) => void;
  currentAmountCents: number;
  currentAmountDisplay: string;
  currentItemLabel: string;
  variant: 'page' | 'dashboard';
  onNavigateTab: (tab: NavigationTab) => void;
  onPaymentCompleted?: (paymentId: string) => void;
}

const InnerCheckoutForm: React.FC<InnerCheckoutProps> = ({
  config,
  publishableKey,
  selectedPreset,
  setSelectedPreset,
  customAmount,
  setCustomAmount,
  isCustom,
  setIsCustom,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  currentAmountCents,
  currentAmountDisplay,
  currentItemLabel,
  variant,
  onNavigateTab,
  onPaymentCompleted,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentMethodChoice, setPaymentMethodChoice] = useState<'google_pay' | 'card'>('google_pay');

  // Capability detection state
  const [googlePayAvailable, setGooglePayAvailable] = useState<boolean | null>(null);
  const [isCheckingCapability, setIsCheckingCapability] = useState(true);
  const [expressCheckoutReady, setExpressCheckoutReady] = useState(false);

  // Processing & Confirmation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentIntentStatusResponse | null>(null);
  const [showMerchantRequirements, setShowMerchantRequirements] = useState(false);

  // Browser capability check using PaymentRequest API / Chrome support detection
  useEffect(() => {
    let isMounted = true;

    async function detectGooglePaySupport() {
      setIsCheckingCapability(true);
      try {
        if (typeof window !== 'undefined' && 'PaymentRequest' in window) {
          try {
            const supportedInstruments = [
              {
                supportedMethods: 'https://google.com/pay',
                data: {
                  environment: 'TEST',
                  apiVersion: 2,
                  apiVersionMinor: 0,
                  allowedPaymentMethods: [
                    {
                      type: 'CARD',
                      parameters: {
                        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                        allowedCardNetworks: ['MASTERCARD', 'VISA'],
                      },
                      tokenizationSpecification: {
                        type: 'PAYMENT_GATEWAY',
                        parameters: {
                          gateway: 'stripe',
                          'stripe:version': '2020-08-27',
                          'stripe:publishableKey': publishableKey || 'pk_test_sample',
                        },
                      },
                    },
                  ],
                },
              },
            ];

            const details = {
              total: {
                label: 'Test Precedent Payment',
                amount: { currency: 'USD', value: '1.00' },
              },
            };

            const pr = new PaymentRequest(supportedInstruments, details);
            const canMake = await pr.canMakePayment();
            if (isMounted) {
              setGooglePayAvailable(Boolean(canMake));
            }
          } catch {
            if (isMounted) {
              setGooglePayAvailable(false);
            }
          }
        } else {
          const isChromium = Boolean(
            (window as unknown as { chrome?: unknown }).chrome ||
              navigator.userAgent.includes('Chrome') ||
              navigator.userAgent.includes('Android')
          );
          if (isMounted) {
            setGooglePayAvailable(isChromium);
          }
        }
      } catch {
        if (isMounted) {
          setGooglePayAvailable(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingCapability(false);
        }
      }
    }

    detectGooglePaySupport();

    return () => {
      isMounted = false;
    };
  }, [publishableKey]);

  // Handle Express Checkout Element ready event from Stripe SDK
  const handleExpressCheckoutReady = (event: StripeExpressCheckoutElementReadyEvent) => {
    setExpressCheckoutReady(true);
    setIsCheckingCapability(false);
    if (event.availablePaymentMethods) {
      const hasGpay = Boolean(event.availablePaymentMethods.googlePay);
      setGooglePayAvailable(hasGpay);
    }
  };

  // 1. Official Stripe ExpressCheckoutElement onConfirm callback
  const handleExpressCheckoutConfirm = async (
    event: StripeExpressCheckoutElementConfirmEvent
  ) => {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Step A: Submit Elements
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event.paymentFailed({ reason: 'fail', message: submitError.message });
        setErrorMessage(submitError.message || 'Payment submission failed.');
        setIsProcessing(false);
        return;
      }

      // Step B: Create backend PaymentIntent
      const res = await createPaymentIntent({
        amount_cents: currentAmountCents,
        currency: 'usd',
        customer_name: customerName.trim() || 'Alex Mercer',
        customer_email: customerEmail.trim() || 'alex.m@example.com',
        description: currentItemLabel,
        payment_method_type: 'google_pay',
      });

      if (!res || !res.client_secret) {
        throw new Error('Could not create PaymentIntent on server.');
      }

      // Step C: Authorize with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: res.client_secret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        event.paymentFailed({ reason: 'fail', message: confirmError.message });
        setErrorMessage(confirmError.message || 'Google Pay confirmation failed.');
        return;
      }

      const confirmedId = paymentIntent?.id || res.id;
      const verified = await fetchPaymentIntentStatus(confirmedId);

      setConfirmedPayment(
        verified || {
          id: confirmedId,
          amount: (paymentIntent?.amount || res.amount_cents) / 100,
          amount_cents: paymentIntent?.amount || res.amount_cents,
          currency: paymentIntent?.currency || res.currency,
          status: paymentIntent?.status || 'succeeded',
          description: currentItemLabel,
          created: Math.floor(Date.now() / 1000),
        }
      );
      onPaymentCompleted?.(confirmedId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Pay confirmation error.';
      event.paymentFailed({ reason: 'fail', message: msg });
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Real Card Fallback payment flow with Stripe CardElement
  const handleInitiateCardFallback = async () => {
    setErrorMessage(null);
    if (currentAmountCents < 50) {
      setErrorMessage('Amount must be at least $0.50 (50 cents).');
      return;
    }

    if (!stripe || !elements) {
      setErrorMessage('Stripe is still initializing. Please wait a moment.');
      return;
    }

    const cardEl = elements.getElement(CardElement);
    if (!cardEl) {
      setErrorMessage('Card Element is not mounted.');
      return;
    }

    setIsProcessing(true);

    try {
      const res: CreatePaymentIntentResponse | null = await createPaymentIntent({
        amount_cents: currentAmountCents,
        currency: 'usd',
        customer_name: customerName.trim() || 'Alex Mercer',
        customer_email: customerEmail.trim() || 'alex.m@example.com',
        description: currentItemLabel,
        payment_method_type: 'card',
      });

      if (!res || !res.client_secret) {
        throw new Error('Failed to create PaymentIntent on server.');
      }

      const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(
        res.client_secret,
        {
          payment_method: {
            card: cardEl,
            billing_details: {
              name: customerName.trim() || 'Alex Mercer',
              email: customerEmail.trim() || 'alex.m@example.com',
            },
          },
        }
      );

      if (confirmErr) {
        throw new Error(confirmErr.message || 'Card payment confirmation failed.');
      }

      if (paymentIntent) {
        const verified = await fetchPaymentIntentStatus(paymentIntent.id);
        setConfirmedPayment(
          verified || {
            id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            amount_cents: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            description: currentItemLabel,
            created: Math.floor(Date.now() / 1000),
          }
        );
        onPaymentCompleted?.(paymentIntent.id);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error completing card payment.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setConfirmedPayment(null);
    setErrorMessage(null);
  };

  // ==================== DASHBOARD VARIANT ====================
  if (variant === 'dashboard') {
    return (
      <section
        aria-label="Google Pay Checkout Section"
        className="rounded-2xl border border-teal-500/30 bg-[#091120] p-6 sm:p-7 space-y-6 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Google Pay Checkout
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Stripe Test Mode
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-medium">
              Test customer payment checkout with Google Pay and Stripe Test Mode. Captured transactions immediately register in the Stripe Payments ledger for chargeback intelligence evaluation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('checkout')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <span>Open Full Checkout Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Confirmed Payment Banner */}
        {confirmedPayment ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>${confirmedPayment.amount.toFixed(2)} USD Paid Successfully</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded uppercase">
                {confirmedPayment.status}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              PaymentIntent <code className="font-mono text-teal-300">{confirmedPayment.id}</code> has been captured and registered in the Stripe ledger.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('payments')}
                className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold hover:bg-teal-400 transition-colors"
              >
                View in Stripe Payments Ledger →
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white transition-colors"
              >
                New Checkout
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Amount Selector */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                  Select Amount or Plan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRODUCT_PRESETS.map((p) => {
                    const isSelected = !isCustom && selectedPreset.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setIsCustom(false);
                          setSelectedPreset(p);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-teal-500/60 bg-teal-500/15 shadow-sm'
                            : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-mono font-bold text-slate-100">
                            ${p.amount.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-mono text-teal-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {p.disputeRiskCategory}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {p.tag}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount option */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <label
                  htmlFor="custom-dash-check"
                  className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200"
                >
                  <input
                    id="custom-dash-check"
                    type="radio"
                    checked={isCustom}
                    onChange={() => setIsCustom(true)}
                    className="text-teal-500 focus:ring-teal-400"
                  />
                  <span>Custom Amount</span>
                </label>
                {isCustom && (
                  <div className="relative flex-1 max-w-[180px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.50"
                      placeholder="e.g. 199.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-6 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
                <span className="text-[11px] font-mono text-slate-400 ml-auto">
                  Total: <strong className="text-teal-300 font-bold">${currentAmountDisplay} USD</strong>
                </span>
              </div>
            </div>

            {/* Right 5 Cols: Stripe ExpressCheckoutElement & Wallet Checkout */}
            <div className="lg:col-span-5 space-y-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                  Express Wallet &amp; Card
                </span>
                <span className="text-xs font-mono font-bold text-teal-300">
                  ${currentAmountDisplay}
                </span>
              </div>

              {/* Method choice switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethodChoice('google_pay')}
                  className={`py-1.5 px-2 rounded-md font-medium transition-all ${
                    paymentMethodChoice === 'google_pay'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Google Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethodChoice('card')}
                  className={`py-1.5 px-2 rounded-md font-medium transition-all ${
                    paymentMethodChoice === 'card'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Card Fallback
                </button>
              </div>

              {paymentMethodChoice === 'google_pay' ? (
                <div className="space-y-3">
                  {/* Stripe Express Checkout Element */}
                  <div className="rounded-lg overflow-hidden min-h-[44px]">
                    <ExpressCheckoutElement
                      onReady={handleExpressCheckoutReady}
                      onConfirm={handleExpressCheckoutConfirm}
                      options={{
                        buttonType: {
                          googlePay: 'pay',
                        },
                        buttonTheme: {
                          googlePay: 'black',
                        },
                        wallets: {
                          googlePay: 'auto',
                          applePay: 'never',
                        },
                      }}
                    />
                  </div>

                  {/* Clear message when Google Pay is unavailable in current preview browser sandbox */}
                  {(!googlePayAvailable || (!expressCheckoutReady && !isCheckingCapability)) && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-semibold text-amber-200 text-[11px]">
                            Google Pay Wallet Unavailable in Current Preview Sandbox
                          </div>
                          <p className="text-[10px] text-amber-300/80 leading-relaxed">
                            Google Pay requires a supported Chromium browser with an active Google Account and a saved card in Google Wallet. In sandboxed preview iframes, Google Pay Web API is restricted.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentMethodChoice('card')}
                        className="w-full py-1.5 px-2.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Use Supported Card Fallback (${currentAmountDisplay})</span>
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-xs text-teal-300 font-mono py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing with Stripe...</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Card Fallback in Dashboard */
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Test Card</span>
                      <span className="text-teal-400">4242 •••• •••• 4242</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              color: '#f8fafc',
                              fontSize: '12px',
                              '::placeholder': { color: '#64748b' },
                            },
                            invalid: { color: '#ef4444' },
                          },
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleInitiateCardFallback}
                    className="w-full py-2.5 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing Card...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay ${currentAmountDisplay} with Test Card</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  // ==================== DEDICATED FULL CHECKOUT PAGE ====================
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner & Mode Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-[#0A101D]/90 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-100 flex items-center gap-2">
                Google Pay Checkout
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Stripe Test Mode
                </span>
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Official Google Pay express checkout via Stripe SDK with real PaymentIntent confirmation and dispute intelligence integration
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowMerchantRequirements(!showMerchantRequirements)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-teal-500/30 text-teal-300 hover:bg-slate-800 transition-colors text-[11px] font-medium"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            Merchant Setup Requirements
            {showMerchantRequirements ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
            <KeyRound className="w-3 h-3 text-teal-400" />
            {publishableKey.startsWith('pk_live_')
              ? 'pk_live_••••'
              : publishableKey.startsWith('pk_test_')
              ? `pk_test_••••${publishableKey.slice(-4)}`
              : 'pk_test_configured'}
          </span>
        </div>
      </div>

      {/* Expandable Merchant Setup Guide */}
      {showMerchantRequirements && (
        <div className="rounded-xl border border-teal-500/20 bg-[#091524]/90 p-5 space-y-4 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-teal-500/20">
            <div className="flex items-center gap-2 text-teal-300 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Live Merchant Setup &amp; Approval Checklist for Google Pay
            </div>
            <button
              type="button"
              onClick={() => setShowMerchantRequirements(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-slate-300 leading-relaxed text-xs">
            In Stripe Test Mode, Google Pay operates immediately with test cards and tokenized charges. To activate real Google Pay charges in live production, complete these 4 prerequisites:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[11px] font-mono">1</span>
                Google Pay Business Console Approval
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Register on the{' '}
                <a
                  href="https://pay.google.com/business/console"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-400 underline inline-flex items-center gap-0.5"
                >
                  Google Pay Business Console <ExternalLink className="w-2.5 h-2.5" />
                </a>
                . Submit your business profile and domain for web API approval to obtain a production Merchant ID.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[11px] font-mono">2</span>
                Stripe Dashboard Wallet Activation
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In your Stripe Dashboard navigate to <em>Settings &gt; Payment Methods &gt; Wallets</em> and verify that Google Pay is toggled to <strong>Active</strong>. Stripe automatically handles gateway tokenization.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[11px] font-mono">3</span>
                HTTPS & Domain Registration
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Google Pay on the web strictly mandates a valid SSL/TLS certificate (HTTPS) on the checkout domain. You must also register and verify your domain in the Stripe Dashboard.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[11px] font-mono">4</span>
                Customer Device & Wallet Availability
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The customer must open the checkout in Google Chrome (desktop or Android) with an active Google Account containing at least one saved payment card, or with Google Wallet on mobile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation View (if payment succeeded) */}
      {confirmedPayment ? (
        <div className="rounded-xl border border-emerald-500/30 bg-[#061218]/90 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Confirmed by Stripe Server Ledger
                </span>
                <h2 className="text-xl font-bold text-slate-100">
                  ${confirmedPayment.amount.toFixed(2)} USD Paid Successfully
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authoritative status retrieved directly from server PaymentIntent ledger.
                </p>
              </div>
            </div>

            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase">
              STATUS: {confirmedPayment.status}
            </span>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Payment Intent ID</span>
              <span className="text-teal-300 font-medium truncate block" title={confirmedPayment.id}>
                {confirmedPayment.id}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Customer Reference</span>
              <span className="text-slate-200 truncate block">{customerName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Payment Channel</span>
              <span className="text-slate-200 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-teal-400" /> Stripe Express Checkout
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Precedent Status</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Captured & Monitored
              </span>
            </div>
          </div>

          {/* Action Links into Precedent Intelligence */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('payments')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold hover:bg-teal-400 transition-colors shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                View in Stripe Payments Ledger
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('disputes')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 hover:text-white transition-colors border border-slate-700/80"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Test Chargeback Intelligence Queue
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Initiate Another Payment
            </button>
          </div>
        </div>
      ) : (
        /* Main Two-Column Checkout View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Preset Selection & Customer Inputs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-[#0B1220]/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  1. Select Chargeback Test Scenario
                </h3>
                <span className="text-[11px] font-mono text-slate-400">USD Currency</span>
              </div>

              {/* Product Presets List */}
              <div className="space-y-2.5">
                {PRODUCT_PRESETS.map((preset) => {
                  const isSelected = !isCustom && selectedPreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setIsCustom(false);
                        setSelectedPreset(preset);
                      }}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-4 ${
                        isSelected
                          ? 'border-teal-500/60 bg-teal-500/10 shadow-sm'
                          : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs">
                            {preset.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                            {preset.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{preset.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-mono font-bold text-slate-100">
                          ${preset.amount.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-teal-400 font-mono">
                          {preset.disputeRiskCategory}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Custom Amount Option */}
                <div
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCustom
                      ? 'border-teal-500/50 bg-teal-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label
                      htmlFor="custom-amount-radio-full"
                      className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200"
                    >
                      <input
                        id="custom-amount-radio-full"
                        type="radio"
                        checked={isCustom}
                        onChange={() => setIsCustom(true)}
                        className="text-teal-500 focus:ring-teal-400"
                      />
                      Custom Amount Checkout
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">Min $0.50</span>
                  </div>

                  {isCustom && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.50"
                          placeholder="e.g. 199.00"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Input Fields */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="Customer Name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Google Pay Capability Diagnostics Panel */}
            <div className="rounded-xl border border-slate-800/80 bg-[#0B1220]/60 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                  Google Pay Device & Browser Readiness
                </span>
                {isCheckingCapability ? (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Loader2 className="w-3 h-3 animate-spin" /> Detecting...
                  </span>
                ) : googlePayAvailable ? (
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Wallet Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Stripe Test Mode Active
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed space-y-1">
                <p>
                  <strong className="text-slate-200">Device Detection:</strong>{' '}
                  {googlePayAvailable
                    ? 'Supported. Google Pay web wallet is active on this browser session with Stripe ExpressCheckoutElement.'
                    : 'Digital wallet not bound in current preview sandbox. The official Stripe ExpressCheckoutElement is mounted with supported Card Fallback.'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Merchant ID: <span className="text-teal-400">precedent_enterprise_test</span> · Mode:{' '}
                  <span className="text-slate-300">Stripe Test Mode (USD)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Express Checkout Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-[#0B1220] p-5 space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  2. Express Checkout
                </h3>
                <span className="text-sm font-mono font-bold text-teal-300">
                  Total: ${currentAmountDisplay}
                </span>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentMethodChoice('google_pay')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethodChoice === 'google_pay'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                  Google Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethodChoice('card')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethodChoice === 'card'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                  Card Fallback
                </button>
              </div>

              {/* Primary Action: Official Stripe SDK ExpressCheckoutElement */}
              {paymentMethodChoice === 'google_pay' ? (
                <div className="space-y-3">
                  {/* Real Stripe Elements Express Checkout Component for Google Pay */}
                  <div className="rounded-lg overflow-hidden min-h-[48px]">
                    <ExpressCheckoutElement
                      onReady={handleExpressCheckoutReady}
                      onConfirm={handleExpressCheckoutConfirm}
                      options={{
                        buttonType: {
                          googlePay: 'pay',
                        },
                        buttonTheme: {
                          googlePay: 'black',
                        },
                        wallets: {
                          googlePay: 'auto',
                          applePay: 'never',
                        },
                      }}
                    />
                  </div>

                  {/* Clear message if Google Pay wallet is unavailable in current preview sandbox */}
                  {(!googlePayAvailable || (!expressCheckoutReady && !isCheckingCapability)) && (
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-amber-200">
                            Google Pay Wallet Unavailable in Current Preview Sandbox
                          </h4>
                          <p className="text-[11px] text-amber-300/80 leading-relaxed">
                            Google Pay requires a supported Chromium browser (Chrome or Edge) with an active Google Account and a payment method saved to Google Wallet. In sandboxed preview iframes, the browser disables native wallet prompts.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-300 font-medium">
                          Complete checkout with Card Fallback:
                        </span>
                        <button
                          type="button"
                          onClick={() => setPaymentMethodChoice('card')}
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Switch to Card Fallback</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-xs text-teal-300 font-mono py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing with Stripe Google Pay...</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Official Stripe SDK
                    </span>
                    <span>Test Mode Enabled</span>
                  </div>
                </div>
              ) : (
                /* Standard Card Fallback Section */
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Card Details (Stripe Test Card)</span>
                      <span className="font-mono text-teal-400">4242 •••• •••• 4242</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              color: '#f8fafc',
                              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                              fontSize: '13px',
                              '::placeholder': {
                                color: '#64748b',
                              },
                            },
                            invalid: {
                              color: '#ef4444',
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                      <div>Exp: Any Future (e.g. 12/28)</div>
                      <div>CVC: Any 3 Digits (123)</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleInitiateCardFallback}
                    className="w-full py-3 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing Card Intent...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pay ${currentAmountDisplay} with Test Card
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Error Message banner */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Dual Architecture Explanation */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-medium text-slate-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-teal-400" /> Precedent Dual Architecture:
                </span>
                <p>
                  1. Payments captured here immediately register in the Stripe Payments Ledger.
                </p>
                <p>
                  2. In the event of a customer dispute, Precedent evaluates the charge against historical Hindsight memory precedents to recommend a calibrated FIGHT or FOLD representment strategy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Outer Wrapper with Stripe Elements Provider
export const GooglePayCheckout: React.FC<GooglePayCheckoutProps> = ({
  variant = 'page',
  ...props
}) => {
  const [config, setConfig] = useState<StripeConfigResponse | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<ProductPreset>(PRODUCT_PRESETS[0]);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState('Alex Mercer');
  const [customerEmail, setCustomerEmail] = useState('alex.m@example.com');

  useEffect(() => {
    fetchStripeConfig().then((cfg) => {
      if (cfg) setConfig(cfg);
    });
  }, []);

  const currentAmountCents = isCustom
    ? Math.round((parseFloat(customAmount) || 0) * 100)
    : selectedPreset.amountCents;

  const currentAmountDisplay = (currentAmountCents / 100).toFixed(2);
  const currentItemLabel = isCustom
    ? `Precedent Custom Checkout ($${currentAmountDisplay})`
    : selectedPreset.name;

  // Read publishable key authoritatively from frontend env, falling back to server config
  const publishableKey = useMemo(() => {
    const envKey = getFrontendStripePublishableKey();
    return envKey || config?.publishable_key || 'pk_test_51UOthHHoPoB7rpEf5boSwkDVop1DAuTu7n334lhmFuuJ3BV6WrhKhKj4dkV0BvrbAVh047gYyWtSkPNmgqWMHd9k00cR1YapWo';
  }, [config?.publishable_key]);

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const elementsOptions: StripeElementsOptions = useMemo(
    () => ({
      mode: 'payment',
      amount: Math.max(50, currentAmountCents),
      currency: 'usd',
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#14b8a6',
          colorBackground: '#0b1220',
          colorText: '#f8fafc',
          colorDanger: '#ef4444',
        },
      },
    }),
    [currentAmountCents]
  );

  return (
    <Elements
      key={`${publishableKey}-${currentAmountCents}`}
      stripe={stripePromise}
      options={elementsOptions}
    >
      <InnerCheckoutForm
        config={config}
        publishableKey={publishableKey}
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
        isCustom={isCustom}
        setIsCustom={setIsCustom}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        currentAmountCents={currentAmountCents}
        currentAmountDisplay={currentAmountDisplay}
        currentItemLabel={currentItemLabel}
        variant={variant}
        {...props}
      />
    </Elements>
  );
};
