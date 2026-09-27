import React from 'react';
import { Terminal, CheckCircle2, Box, Cpu, Sparkles, Activity, ShieldAlert } from 'lucide-react';

export const TechStrip: React.FC = () => {
  const technologies = [
    { name: 'Java 17/21', role: 'Source Target', icon: Box },
    { name: 'JUnit 5', role: 'Test Framework', icon: CheckCircle2 },
    { name: 'Maven', role: 'Build & Execution', icon: Terminal },
    { name: 'Gemini', role: 'Generation LLM', icon: Sparkles },
    { name: 'OpenAI', role: 'Refinement LLM', icon: Cpu },
    { name: 'JaCoCo', role: 'Coverage Profiling', icon: Activity },
    { name: 'PIT', role: 'Mutation Testing', icon: ShieldAlert },
  ];

  return (
    <section className="py-10 border-y border-slate-800/80 bg-[#080c14]/70">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 font-semibold uppercase tracking-widest shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400/80" />
            <span>BUILT AROUND</span>
          </div>

          {/* Technology Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 sm:gap-3">
            {technologies.map((tech) => {
              const Icon = tech.icon;
              return (
                <div
                  key={tech.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm group"
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400 group-hover:text-teal-300 transition-colors" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">{tech.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">{tech.role}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
