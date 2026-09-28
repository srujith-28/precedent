import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  deltaText: string;
  deltaTone?: 'positive' | 'neutral' | 'accent';
  subtext: string;
  isDemo?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  deltaText,
  deltaTone = 'positive',
  subtext,
  isDemo = false,
  onClick,
}) => {
  const toneClass =
    deltaTone === 'positive'
      ? 'text-teal-400'
      : deltaTone === 'accent'
      ? 'text-cyan-400'
      : 'text-slate-400';

  const content = (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">{label}</span>
          {isDemo && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Demo
            </span>
          )}
        </div>
        <span className={`font-mono text-xs font-medium tabular-nums ${toneClass}`}>
          {deltaText}
        </span>
      </div>
      <div className="my-3 font-mono text-3xl font-semibold tracking-tight text-slate-100 tabular-nums">
        {value}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{subtext}</p>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-[#0C1322] border border-slate-800/80 hover:border-teal-500/40 rounded-xl p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-[#0C1322] border border-slate-800/80 rounded-xl p-5">
      {content}
    </div>
  );
};
