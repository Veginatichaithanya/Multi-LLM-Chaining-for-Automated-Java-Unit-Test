import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accentColor?: 'cyan' | 'teal' | 'indigo' | 'amber';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  accentColor = 'cyan',
}) => {
  const getBadgeClasses = () => {
    switch (accentColor) {
      case 'teal':
        return 'bg-teal-950/70 text-teal-400 border-teal-800/60';
      case 'indigo':
        return 'bg-indigo-950/70 text-indigo-400 border-indigo-800/60';
      case 'amber':
        return 'bg-amber-950/70 text-amber-400 border-amber-800/60';
      case 'cyan':
      default:
        return 'bg-cyan-950/70 text-cyan-400 border-cyan-800/60';
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#090d16]/95 border border-slate-800/90 hover:border-slate-700/80 transition-all duration-200 shadow-lg shadow-black/20 flex flex-col justify-between group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            {title}
          </span>
          {/* CRITICAL: Value '--' displayed strictly without fake numbers */}
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-200 tracking-wider">
            {value}
          </div>
        </div>

        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${getBadgeClasses()}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <p className="text-[11px] text-slate-400 leading-snug font-sans truncate">
          {description}
        </p>
        <span className="text-[10px] font-mono text-slate-500 bg-[#050810] px-1.5 py-0.5 rounded border border-slate-800 shrink-0 ml-2">
          Ready
        </span>
      </div>
    </div>
  );
};
