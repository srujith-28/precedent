import React from 'react';
import { CaseFormInput } from '../types/precedent';
import { DISPUTE_TYPES, PRESET_TEST_CASES } from '../data/demoData';
import { ArrowRight, RotateCcw } from 'lucide-react';

interface CaseFormProps {
  formData: CaseFormInput;
  onChange: (updated: CaseFormInput) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAnalyzing: boolean;
  onReset: () => void;
}

export const CaseForm: React.FC<CaseFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isAnalyzing,
  onReset,
}) => {
  const handleFieldChange = (field: keyof CaseFormInput, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  const handleLoadPreset = (preset: CaseFormInput) => {
    onChange({ ...preset });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            1. Case Intake (POST /analyze)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sends <code className="font-mono text-teal-400">case_id</code>,{' '}
            <code className="font-mono text-teal-400">dispute_type</code>,{' '}
            <code className="font-mono text-teal-400">amount</code>,{' '}
            <code className="font-mono text-teal-400">customer_claim</code>, and{' '}
            <code className="font-mono text-teal-400">merchant_evidence</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Fields
        </button>
      </div>

      {/* Demo Cases CB-001 & CB-002 Loader */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">
            Load Hindsight Demo Case
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Demo
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_TEST_CASES.map((preset) => {
            const isSelected = formData.caseId === preset.data.caseId;
            return (
              <button
                key={preset.data.caseId}
                type="button"
                onClick={() => handleLoadPreset(preset.data)}
                className={`flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-200'
                    : 'bg-[#080D19] border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                <span className="font-medium truncate">{preset.label}</span>
                <span className="font-mono text-[10px] text-amber-300/80 shrink-0 ml-2">
                  {preset.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 1: Case ID & Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="caseId"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Case ID (<code className="font-mono text-slate-400">case_id</code>)
          </label>
          <input
            id="caseId"
            type="text"
            required
            value={formData.caseId}
            onChange={(e) => handleFieldChange('caseId', e.target.value)}
            placeholder="CB-002"
            className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Amount (<code className="font-mono text-slate-400">amount</code>)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400">
              $
            </span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => handleFieldChange('amount', e.target.value)}
              placeholder="129.99"
              className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Dispute Type */}
      <div>
        <label
          htmlFor="disputeType"
          className="block text-xs font-medium text-slate-300 mb-1.5"
        >
          Dispute Type (<code className="font-mono text-slate-400">dispute_type</code>)
        </label>
        <select
          id="disputeType"
          value={formData.disputeType}
          onChange={(e) => handleFieldChange('disputeType', e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400 transition-colors"
        >
          {DISPUTE_TYPES.map((type) => (
            <option
              key={type.value}
              value={type.value}
              className="bg-[#0C1322] text-slate-100"
            >
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Customer Claim */}
      <div>
        <label
          htmlFor="customerClaim"
          className="block text-xs font-medium text-slate-300 mb-1.5"
        >
          Customer Claim (<code className="font-mono text-slate-400">customer_claim</code>)
        </label>
        <textarea
          id="customerClaim"
          rows={3}
          required
          value={formData.customerClaim}
          onChange={(e) => handleFieldChange('customerClaim', e.target.value)}
          placeholder="Customer claims cancellation before renewal."
          className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors leading-relaxed"
        />
      </div>

      {/* Merchant Evidence */}
      <div>
        <label
          htmlFor="merchantEvidence"
          className="block text-xs font-medium text-slate-300 mb-1.5"
        >
          Merchant Evidence (<code className="font-mono text-slate-400">merchant_evidence</code>)
        </label>
        <textarea
          id="merchantEvidence"
          rows={3}
          required
          value={formData.merchantEvidence}
          onChange={(e) => handleFieldChange('merchantEvidence', e.target.value)}
          placeholder="transaction receipt and account activity."
          className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors leading-relaxed"
        />
      </div>

      {/* Prominent Analyze with Precedent CTA */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-60 rounded-lg transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <span>
            {isAnalyzing
              ? 'Calling POST /analyze...'
              : 'Analyze with Precedent'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
