import React from 'react';
import { Sparkles, FolderGit2, FlaskConical, FileText, ArrowUpRight } from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (title: string, description: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const actions = [
    {
      id: 'new-analysis',
      title: 'New Analysis',
      description: 'Upload a Java project and generate tests.',
      icon: Sparkles,
      accent: 'cyan',
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'View and manage your Java projects.',
      icon: FolderGit2,
      accent: 'teal',
    },
    {
      id: 'experiments',
      title: 'Experiments',
      description: 'Compare single-LLM and multi-LLM configurations.',
      icon: FlaskConical,
      accent: 'indigo',
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Review generated evaluation reports.',
      icon: FileText,
      accent: 'amber',
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Quick Actions
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          Core Workflows
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onActionClick(action.title, action.description)}
              className="p-4 rounded-2xl bg-[#090d16]/95 border border-slate-800/90 hover:border-slate-700/80 hover:bg-[#0c1220] transition-all duration-200 text-left group flex flex-col justify-between h-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-[#050810] border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-700/60 group-hover:text-cyan-300 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                  {action.title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
