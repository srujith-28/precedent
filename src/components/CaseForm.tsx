import React, { useState } from 'react';
import { CaseFormInput } from '../types/precedent';
import {
  DISPUTE_TYPES,
  INTAKE_EXAMPLES,
  DEMO_INTAKE_TEMPLATES,
} from '../data/demoData';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface CaseFormProps {
  formData: CaseFormInput;
  onChange: (updated: CaseFormInput) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAnalyzing: boolean;
  onReset: () => void;
  onStartNewCase?: () => void;
}

export const CaseForm: React.FC<CaseFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isAnalyzing,
  onReset,
  onStartNewCase,
}) => {
  const [templateTab, setTemplateTab] = useState<'sequential' | 'demo'>(
    'sequential'
  );

  const handleFieldChange = (field: keyof CaseFormInput, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">
              Dispute Intake
            </h2>
            {formData.caseId.trim() && (
              <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                {formData.caseId.trim()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sent to <code className="font-mono text-teal-400">POST /analyze</code> with{' '}
            <code className="font-mono text-slate-300">case_id</code>,{' '}
            <code className="font-mono text-slate-300">dispute_type</code>,{' '}
            <code className="font-mono text-slate-300">amount</code>,{' '}
            <code className="font-mono text-slate-300">customer_claim</code>, and{' '}
            <code className="font-mono text-slate-300">merchant_evidence</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onStartNewCase && (
            <button
              type="button"
              onClick={onStartNewCase}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Case</span>
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Fields</span>
          </button>
        </div>
      </div>

      {/* Input Template Helpers (only fills form inputs, never generates fake results) */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-0.5 bg-[#080D19] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setTemplateTab('sequential')}
              className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded transition-colors ${
                templateTab === 'sequential'
                  ? 'bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sequential Flow (CB-001..003)
            </button>
            <button
              type="button"
              onClick={() => setTemplateTab('demo')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded transition-colors ${
                templateTab === 'demo'
                  ? 'bg-violet-500/20 border border-violet-500/40 text-violet-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>Demo Library (10 Scenarios)</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500">
            Fills form fields only
          </span>
        </div>

        {templateTab === 'sequential' ? (
          <div className="grid grid-cols-1 gap-2">
            {INTAKE_EXAMPLES.map((preset) => {
              const isSelected =
                formData.caseId.trim().toUpperCase() ===
                preset.data.caseId.toUpperCase();
              return (
                <button
                  key={preset.data.caseId}
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => onChange({ ...preset.data })}
                  className={`flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-200'
                      : 'bg-[#080D19] border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                  }`}
                >
                  <span className="font-mono font-medium truncate">
                    {preset.label}
                  </span>
                  <span className="font-mono text-[10px] text-cyan-400 shrink-0 ml-2">
                    {preset.tag}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {DEMO_INTAKE_TEMPLATES.map((preset) => {
              const isSelected =
                formData.caseId.trim().toUpperCase() ===
                preset.data.caseId.toUpperCase();
              return (
                <button
                  key={preset.data.caseId}
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => onChange({ ...preset.data })}
                  className={`flex flex-col items-start p-2.5 text-left text-xs rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-violet-500/15 border-violet-500/40 text-violet-100'
                      : 'bg-[#080D19] border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-mono font-bold text-slate-100 text-[11px]">
                      {preset.data.caseId}
                    </span>
                    <span className="font-mono text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded">
                      ${preset.data.amount}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium line-clamp-1">
                    {preset.scenario}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 mt-1">
                    {preset.tag}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 1: Case ID & Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="caseId"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Case ID (<code className="font-mono text-teal-400">case_id</code>)
          </label>
          <input
            id="caseId"
            type="text"
            required
            disabled={isAnalyzing}
            value={formData.caseId}
            onChange={(e) => handleFieldChange('caseId', e.target.value)}
            placeholder="CB-001, CB-002, CB-003..."
            className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold tabular-nums bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 disabled:opacity-60 transition-colors"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            e.g. CB-001, CB-002, CB-003
          </span>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Amount (USD)
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
              disabled={isAnalyzing}
              value={formData.amount}
              onChange={(e) => handleFieldChange('amount', e.target.value)}
              placeholder="129.99"
              className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 disabled:opacity-60 transition-colors"
            />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Disputed transaction value
          </span>
        </div>
      </div>

      {/* Dispute Type */}
      <div>
        <label
          htmlFor="disputeType"
          className="block text-xs font-medium text-slate-300 mb-1.5"
        >
          Dispute Type
        </label>
        <select
          id="disputeType"
          disabled={isAnalyzing}
          value={formData.disputeType}
          onChange={(e) => handleFieldChange('disputeType', e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-teal-400 disabled:opacity-60 transition-colors"
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
          Customer Claim
        </label>
        <textarea
          id="customerClaim"
          rows={3}
          required
          disabled={isAnalyzing}
          value={formData.customerClaim}
          onChange={(e) => handleFieldChange('customerClaim', e.target.value)}
          placeholder="Example: Customer claims cancellation before renewal."
          className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 disabled:opacity-60 transition-colors leading-relaxed"
        />
        <span className="text-[11px] text-slate-500 mt-1 block">
          Summary of the cardholder dispute allegation from the issuer
        </span>
      </div>

      {/* Merchant Evidence */}
      <div>
        <label
          htmlFor="merchantEvidence"
          className="block text-xs font-medium text-slate-300 mb-1.5"
        >
          Merchant Evidence
        </label>
        <textarea
          id="merchantEvidence"
          rows={3}
          required
          disabled={isAnalyzing}
          value={formData.merchantEvidence}
          onChange={(e) =>
            handleFieldChange('merchantEvidence', e.target.value)
          }
          placeholder="Example: transaction receipt and account activity."
          className="w-full px-3.5 py-2.5 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 disabled:opacity-60 transition-colors leading-relaxed"
        />
        <span className="text-[11px] text-slate-500 mt-1 block">
          Available logs, receipts, communications, or delivery records
        </span>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <span>
            {isAnalyzing
              ? `Analyzing ${formData.caseId || 'Dispute'}...`
              : `Analyze ${formData.caseId.trim() || 'Case'} with Precedent`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
