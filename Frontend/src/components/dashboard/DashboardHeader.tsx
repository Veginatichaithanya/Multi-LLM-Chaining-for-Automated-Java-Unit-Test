import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, FolderGit2, Terminal } from 'lucide-react';

interface DashboardHeaderProps {
  onNewAnalysis: () => void;
  onViewProjects: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onNewAnalysis,
  onViewProjects,
}) => {
  const { user } = useAuth();
  const userName = user?.name || 'Developer';

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
      {/* Title & Subtitle */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-mono mb-2">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>JAVA TEST SYNTHESIS BENCHMARK</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Your Java testing workspace at a glance.
        </p>
      </div>

      {/* Action CTAs */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onViewProjects}
          className="px-4 py-2.5 rounded-xl bg-[#0b101c] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          <FolderGit2 className="w-4 h-4 text-slate-400" />
          <span>View Projects</span>
        </button>

        <button
          type="button"
          onClick={onNewAnalysis}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:brightness-110 active:scale-[0.98] text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
      </div>
    </div>
  );
};
