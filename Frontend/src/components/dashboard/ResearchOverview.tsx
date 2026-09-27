import React from 'react';
import { Cpu, ArrowRight, FlaskConical, CheckCircle2, Info } from 'lucide-react';

interface ResearchOverviewProps {
  onConfigureExperiments?: () => void;
}

export const ResearchOverview: React.FC<ResearchOverviewProps> = ({ onConfigureExperiments }) => {
  const configs = [
    {
      id: 'cfg-1',
      badge: 'Single LLM',
      modelName: 'Gemini',
      version: 'Gemini 1.5 Flash',
      role: 'Baseline Generator',
      flow: ['Gemini 1.5'],
      status: 'Ready for experiments',
      accent: 'cyan',
    },
    {
      id: 'cfg-2',
      badge: 'Single LLM',
      modelName: 'OpenAI',
      version: 'GPT-4o mini / 4o',
      role: 'Baseline Generator',
      flow: ['OpenAI GPT-4o'],
      status: 'Ready for experiments',
      accent: 'teal',
    },
    {
      id: 'cfg-3',
      badge: 'Multi-LLM',
      modelName: 'Gemini → OpenAI',
      version: 'Gemini 1.5 + GPT-4o Chained',
      role: 'Feedback-Refinement Engine',
      flow: ['Gemini', 'OpenAI'],
      status: 'Ready for experiments',
      accent: 'emerald',
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Research Configuration
          </h2>
          <p className="text-xs text-slate-400">
            Empirical comparative matrix for single-LLM vs. chained multi-LLM test synthesis.
          </p>
        </div>
        {onConfigureExperiments ? (
          <button
            type="button"
            onClick={onConfigureExperiments}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/40"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {configs.map((cfg) => {
          return (
            <div
              key={cfg.id}
              className="p-5 rounded-2xl bg-[#090d16]/95 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-lg shadow-black/10 group"
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {cfg.badge}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{cfg.status}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                  {cfg.modelName}
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {cfg.version}
                </p>

                {/* Chaining Flow Visualizer */}
                <div className="mt-4 p-3 rounded-xl bg-[#050810] border border-slate-800/90 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Architecture Setup
                  </div>
                  {cfg.flow.length === 1 ? (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{cfg.flow[0]} Direct Output</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-cyan-400">Gemini</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-400 text-[10px]">JaCoCo Loop</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-teal-400">OpenAI</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Research Disclosure Footer - No fake percentages */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span className="text-slate-500 text-[10px] font-mono">
                  {cfg.role}
                </span>
                <span className="text-[10px] font-mono text-cyan-400/80">
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
          <strong className="text-slate-200">Empirical Research Note:</strong> Single and multi-LLM performance metrics will be measured against standard Java benchmarks (JaCoCo branch coverage, mutation scores, compilation pass rates). No synthetic percentages are claimed prior to benchmark execution.
        </p>
      </div>
    </section>
  );
};
