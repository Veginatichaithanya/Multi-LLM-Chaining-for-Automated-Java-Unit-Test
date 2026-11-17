import React from 'react';
import { ArrowRight, FlaskConical, CheckCircle2, Info, Sparkles, Globe, Bot, Layers } from 'lucide-react';

interface ResearchOverviewProps {
  onConfigureExperiments?: () => void;
}

export const ResearchOverview: React.FC<ResearchOverviewProps> = ({ onConfigureExperiments }) => {
  const configs = [
    {
      id: 'cfg-gemini',
      badge: 'Single LLM',
      badgeColor: 'border-cyan-800/60 bg-cyan-950/40 text-cyan-300',
      modelName: 'Google Gemini API',
      version: 'gemini-2.5-flash-lite',
      role: 'Baseline Test Generator',
      architectureTitle: 'Google GenAI Direct Output',
      flowType: 'single',
      flowLabel: 'Gemini 2.5 Flash Direct',
      status: 'Ready for experiments',
      icon: Sparkles,
      iconColor: 'text-cyan-400',
    },
    {
      id: 'cfg-openrouter',
      badge: 'Single LLM',
      badgeColor: 'border-teal-800/60 bg-teal-950/40 text-teal-300',
      modelName: 'OpenRouter Gateway',
      version: 'openai/gpt-4o',
      role: 'Universal LLM Gateway',
      architectureTitle: 'OpenRouter Direct Output',
      flowType: 'single',
      flowLabel: 'OpenRouter GPT-4o Direct',
      status: 'Ready for experiments',
      icon: Globe,
      iconColor: 'text-teal-400',
    },
    {
      id: 'cfg-agentrouter',
      badge: 'Single LLM',
      badgeColor: 'border-indigo-800/60 bg-indigo-950/40 text-indigo-300',
      modelName: 'AgentRouter Gateway',
      version: 'gpt-4o / Claude 3.5',
      role: 'Autonomous Proxy Gateway',
      architectureTitle: 'Enterprise Agentic Proxy',
      flowType: 'single',
      flowLabel: 'AgentRouter gpt-4o Direct',
      status: 'Ready for experiments',
      icon: Bot,
      iconColor: 'text-indigo-400',
    },
    {
      id: 'cfg-chaining',
      badge: 'Multi-LLM Chaining',
      badgeColor: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300',
      modelName: 'Gemini → Refinement Chain',
      version: 'Gemini 2.5 + GPT-4o Chained',
      role: 'AST Feedback-Refinement Engine',
      architectureTitle: 'Feedback-Refinement Loop',
      flowType: 'chained',
      status: 'Ready for experiments',
      icon: Layers,
      iconColor: 'text-emerald-400',
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Research Configuration Matrix</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
              Multi-LLM Supported
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Empirical comparative matrix for Single-LLM (Gemini API, OpenRouter, AgentRouter) vs. Chained Multi-LLM test synthesis.
          </p>
        </div>
        {onConfigureExperiments ? (
          <button
            type="button"
            onClick={onConfigureExperiments}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 shadow-sm"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Configure Matrix</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multi-LLM Chaining Project</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((cfg) => {
          const Icon = cfg.icon;
          return (
            <div
              key={cfg.id}
              className="p-5 rounded-2xl bg-[#090d16]/95 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-lg shadow-black/10 group"
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                    {cfg.badge}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{cfg.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors leading-tight">
                      {cfg.modelName}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 leading-tight mt-0.5">
                      {cfg.version}
                    </p>
                  </div>
                </div>

                {/* Architecture Setup */}
                <div className="mt-4 p-3 rounded-xl bg-[#050810] border border-slate-800/90 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    {cfg.architectureTitle}
                  </div>
                  {cfg.flowType === 'single' ? (
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <Icon className={`w-3.5 h-3.5 ${cfg.iconColor} shrink-0`} />
                      <span className="truncate text-[11px]">{cfg.flowLabel}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 overflow-x-auto">
                      <span className="text-cyan-400 font-bold shrink-0">Gemini</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-slate-400 text-[10px] shrink-0">JaCoCo</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-emerald-400 font-bold shrink-0">GPT-4o</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Research Disclosure Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span className="text-slate-500 text-[10px] font-mono truncate mr-2">
                  {cfg.role}
                </span>
                <span className="text-[10px] font-mono text-cyan-400/80 shrink-0">
                  Ready to Benchmark
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodology Note */}
      <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-200">Empirical Research Note:</strong> Single and multi-LLM performance metrics (Google Gemini API, OpenRouter, AgentRouter) are measured against standard Java benchmarks (JaCoCo branch coverage, mutation scores, compilation pass rates). No synthetic percentages are claimed prior to benchmark execution.
        </p>
      </div>
    </section>
  );
};
