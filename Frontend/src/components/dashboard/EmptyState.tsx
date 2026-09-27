import React from 'react';
import { type LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  badge,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl bg-[#090d16]/70 border border-dashed border-slate-800/90 hover:border-slate-700/80 transition-all">
      {badge && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 bg-[#050810] px-2.5 py-0.5 rounded-full border border-slate-800 mb-3">
          {badge}
        </span>
      )}

      <div className="w-12 h-12 rounded-2xl bg-[#0d1322] border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>

      <h4 className="text-sm font-bold text-white mb-1.5">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-white transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
