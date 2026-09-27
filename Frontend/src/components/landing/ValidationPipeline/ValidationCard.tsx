import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ValidationStageData {
  id: number;
  stageNumber: string;
  title: string;
  badge: string;
  description: string;
  details: string;
  icon: LucideIcon;
  iconColor: string;
  iconBoxColor?: string;
  badgeColor: string;
  technicalSpecs: {
    input: string;
    gateCriteria: string;
    output: string;
  };
}

interface ValidationCardProps {
  stage: ValidationStageData;
  isActive: boolean;
  onClick: () => void;
}

export const ValidationCard: React.FC<ValidationCardProps> = ({
  stage,
  isActive,
  onClick,
}) => {
  const Icon = stage.icon;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Validation Stage ${stage.stageNumber}: ${stage.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`h-full min-h-[310px] rounded-2xl p-6 flex flex-col justify-between text-left cursor-pointer transition-all duration-300 relative select-none ${
        isActive
          ? 'bg-white dark:bg-[#0e1526] border-cyan-500 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-400/40 -translate-y-1'
          : 'bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800/80 hover:border-cyan-400/60 hover:bg-slate-50/50 dark:hover:bg-[#0c121e] hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/80 dark:hover:shadow-cyan-950/30 shadow-sm'
      }`}
    >
      <div>
        {/* TOP: [icon] & [badge] */}
        <div className="flex items-center justify-between mb-5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs border ${
              isActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-600 dark:text-cyan-300 shadow-cyan-500/20'
                : stage.iconBoxColor || 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400'
            }`}
          >
            <Icon className="w-5 h-5 transition-transform duration-300" />
          </div>

          <div className="flex items-center gap-2">
            {isActive && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                ACTIVE
              </span>
            )}
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded border transition-colors ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/90 dark:border-cyan-500/80 dark:text-cyan-200 font-semibold'
                  : stage.badgeColor
              }`}
            >
              {stage.badge}
            </span>
          </div>
        </div>

        {/* TITLE: 0X. [Title] */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-baseline gap-2">
          <span
            className={`font-mono text-sm transition-colors ${
              isActive ? 'text-cyan-600 dark:text-cyan-400 font-black' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            0{stage.id}.
          </span>
          <span className={isActive ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}>
            {stage.title}
          </span>
        </h3>

        {/* SHORT DESCRIPTION */}
        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2.5 leading-snug">
          {stage.description}
        </p>

        {/* DETAIL */}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {stage.details}
        </p>
      </div>

      {/* BOTTOM FOOTER: ────────────────────────────── */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <span
          className={`transition-colors ${
            isActive ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {isActive ? `● ACTIVE STAGE 0${stage.id}` : `VALIDATION STAGE 0${stage.id}`}
        </span>
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>Rigorous Checking</span>
        </span>
      </div>
    </div>
  );
};
