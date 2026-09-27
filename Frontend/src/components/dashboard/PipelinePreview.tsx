import React from 'react';
import {
  FileCode2,
  Binary,
  Sparkles,
  TestTube2,
  ShieldCheck,
  Gauge,
  Bot,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface PipelineStepDisplay {
  id: string;
  name: string;
  subtitle: string;
  category: 'input' | 'analysis' | 'llm-gemini' | 'test' | 'validation' | 'coverage' | 'llm-openai' | 'final';
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

export const PipelinePreview: React.FC = () => {
  const steps: PipelineStepDisplay[] = [
    {
      id: 'step-1',
      name: 'Java Source',
      subtitle: 'Classes & AST',
      category: 'input',
      icon: FileCode2,
      tag: 'Step 01',
    },
    {
      id: 'step-2',
      name: 'Code Analysis',
      subtitle: 'CFG Extraction',
      category: 'analysis',
      icon: Binary,
      tag: 'Step 02',
    },
    {
      id: 'step-3',
      name: 'Gemini',
      subtitle: 'Draft Generator',
      category: 'llm-gemini',
      icon: Sparkles,
      tag: 'Step 03',
    },
    {
      id: 'step-4',
      name: 'JUnit Tests',
      subtitle: 'Test Compilation',
      category: 'test',
      icon: TestTube2,
      tag: 'Step 04',
    },
    {
      id: 'step-5',
      name: 'Validation',
      subtitle: 'Sandbox Exec',
      category: 'validation',
      icon: ShieldCheck,
      tag: 'Step 05',
    },
    {
      id: 'step-6',
      name: 'JaCoCo',
      subtitle: 'Coverage Feedback',
      category: 'coverage',
      icon: Gauge,
      tag: 'Step 06',
    },
    {
      id: 'step-7',
      name: 'OpenAI Refinement',
      subtitle: 'Patch Refinement',
      category: 'llm-openai',
      icon: Bot,
      tag: 'Step 07',
    },
    {
      id: 'step-8',
      name: 'Final Tests',
      subtitle: 'Verified Suite',
      category: 'final',
      icon: CheckCircle2,
      tag: 'Step 08',
    },
  ];

  const getStepColorClass = (category: PipelineStepDisplay['category']) => {
    switch (category) {
      case 'llm-gemini':
        return 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300 shadow-cyan-950/40';
      case 'llm-openai':
        return 'border-teal-500/60 bg-teal-950/40 text-teal-300 shadow-teal-950/40';
      case 'coverage':
        return 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300 shadow-indigo-950/40';
      case 'final':
        return 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300 shadow-emerald-950/40';
      default:
        return 'border-slate-800 bg-[#070b14] text-slate-300';
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            TestForge AI Chaining Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            Automated closed-loop Java test generation and empirical refinement flow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono text-cyan-400">
            Visualization Only • Ready for Runs
          </span>
        </div>
      </div>

      {/* Pipeline Flow Container */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#090d16]/95 border border-slate-800/90 shadow-xl overflow-x-auto">
        <div className="min-w-[700px] lg:min-w-full">
          {/* Desktop/Tablet Horizontal Grid with Connecting Paths */}
          <div className="grid grid-cols-8 gap-2 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.id} className="relative flex flex-col items-center group">
                  {/* Step Card */}
                  <div
                    className={`w-full p-3 rounded-xl border flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] shadow-md ${getStepColorClass(
                      step.category
                    )}`}
                  >
                    <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                      {step.tag}
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-[#050810] border border-slate-800/80 flex items-center justify-center mb-2 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>

                    <span className="text-xs font-bold text-white leading-snug">
                      {step.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {step.subtitle}
                    </span>
                  </div>

                  {/* Flow Arrow (Connector between nodes) */}
                  {!isLast && (
                    <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-600 group-hover:text-cyan-400 transition-colors pointer-events-none">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Technical Pipeline Info Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400">Phase 1: Gemini 1.5 Draft</span>
              <span className="text-slate-600">→</span>
              <span className="text-indigo-400">JaCoCo Diagnostics</span>
              <span className="text-slate-600">→</span>
              <span className="text-teal-400">Phase 2: GPT-4o Refinement</span>
            </div>
            <span className="text-slate-500">
              Deterministic feedback loop eliminates hallucinations
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
