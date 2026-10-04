import React, { useState } from 'react';
import { 
  Cpu, 
  TerminalSquare, 
  PlaySquare, 
  BarChart3, 
  Repeat, 
  Scale, 
  Workflow, 
  ExternalLink 
} from 'lucide-react';
import { ValidationCard, type ValidationStageData } from './ValidationPipeline/ValidationCard';
import { ValidationDetailModal } from './ValidationPipeline/ValidationDetailModal';

export const Features: React.FC = () => {
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const validationStages: ValidationStageData[] = [
    {
      id: 1,
      stageNumber: '01',
      title: 'AI Test Generation',
      badge: 'Prompt Synthesis',
      description: 'Generate initial JUnit 5 tests from Java source code.',
      details: 'Ingests Java method signatures, branching conditions, and class dependencies to synthesize clean JUnit 5 test cases.',
      icon: Cpu,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBoxColor: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/60',
      badgeColor: 'border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold',
      technicalSpecs: {
        input: 'Parsed Java Class AST & Method Contracts',
        gateCriteria: 'Valid JUnit 5 method signatures and non-empty assertions',
        output: 'Candidate TestSuite.java buffer',
      },
    },
    {
      id: 2,
      stageNumber: '02',
      title: 'Compilation Validation',
      badge: 'Compiler Gate',
      description: 'Reject or refine tests that fail compilation.',
      details: 'Catches missing imports, hallucinated method invocations, and type mismatches before tests are ever accepted into the suite.',
      icon: TerminalSquare,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBoxColor: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/60',
      badgeColor: 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold',
      technicalSpecs: {
        input: 'Candidate TestSuite.java + Project Classpath',
        gateCriteria: 'Zero javac compiler errors and symbol resolution faults',
        output: 'Compiled Test.class bytecode binaries',
      },
    },
    {
      id: 3,
      stageNumber: '03',
      title: 'Automated Execution',
      badge: 'JVM Sandbox',
      description: 'Run generated tests through the Java test environment.',
      details: 'Executes candidate tests against the real JVM runtime to differentiate passing tests from software failures and runtime exceptions.',
      icon: PlaySquare,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBoxColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
      badgeColor: 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold',
      technicalSpecs: {
        input: 'Compiled Test.class + Sandboxed JVM Environment',
        gateCriteria: 'Execution without uncaught runtime crash or fatal errors',
        output: 'Surefire XML execution reports & assertion traces',
      },
    },
    {
      id: 4,
      stageNumber: '04',
      title: 'Coverage Analysis',
      badge: 'JaCoCo Bytecode',
      description: 'Measure actual coverage using JaCoCo.',
      details: 'Records bytecode, line, branch, and instruction coverage to provide an objective, empirical map of unexecuted code paths.',
      icon: BarChart3,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBoxColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
      badgeColor: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold',
      technicalSpecs: {
        input: 'JaCoCo runtime execution data (jacoco.exec)',
        gateCriteria: 'Extraction of branch offsets with 0 hit-counts',
        output: 'Structured CoverageGap telemetry report',
      },
    },
    {
      id: 5,
      stageNumber: '05',
      title: 'Iterative Refinement',
      badge: 'Chained Feedback',
      description: 'Use test failures and coverage gaps to guide further generation.',
      details: 'Extracts exact diagnostic traces and missing branch offsets to prompt a second LLM for targeted test repair and expansion.',
      icon: Repeat,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBoxColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
      badgeColor: 'border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold',
      technicalSpecs: {
        input: 'Execution stack traces + Uncovered branch bytecode telemetry',
        gateCriteria: 'Targeted prompt formulation focusing on missing pathways',
        output: 'Refined test candidate addressing previous gaps',
      },
    },
    {
      id: 6,
      stageNumber: '06',
      title: 'Experimental Comparison',
      badge: 'Empirical Benchmark',
      description: 'Compare single-LLM generation against multi-LLM chaining.',
      details: 'Designed as an empirical research platform to evaluate whether chaining models yields higher compilation success and coverage.',
      icon: Scale,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBoxColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60',
      badgeColor: 'border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold',
      technicalSpecs: {
        input: 'Single-LLM metrics vs Multi-LLM chained metrics',
        gateCriteria: 'Statistically controlled evaluation across identical classes',
        output: 'Comprehensive empirical benchmark matrix for research evaluation',
      },
    },
  ];

  const handleCardClick = (id: number) => {
    setActiveStageId(id);
    setIsDetailOpen(true);
  };

  return (
    <section className="py-20 sm:py-28 px-4 bg-slate-50/30 dark:bg-[#06080e] relative overflow-hidden" id="features">
      {/* Background Subtle Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-cyan-950/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:bg-slate-900 border border-cyan-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 mb-4 font-semibold shadow-xs">
            <Workflow className="w-3.5 h-3.5" />
            <span>VALIDATION PIPELINE</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            One Pipeline.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-cyan-400 dark:to-teal-300">
              Multiple Validation Stages.
            </span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            Every generated test undergoes a rigorous pipeline of compilation checking, execution verification, coverage measurement, and iterative multi-LLM refinement.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Click any stage card to inspect deep technical specifications</span>
            <ExternalLink className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>

        {/* 3 × 2 Grid Container with Background Pipeline Flow Lines */}
        <div className="relative">
          {/* Desktop SVG Pipeline Connection Lines (Behind Cards) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block overflow-visible"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="cyan-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" opacity="0.85" />
              </marker>
              <linearGradient id="pipe-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* 1. Row 1: 01 ──→ 02 */}
            <path
              d="M 310 145 L 340 145"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeOpacity="0.75"
              markerEnd="url(#cyan-arrow)"
            />

            {/* 2. Row 1: 02 ──→ 03 */}
            <path
              d="M 655 145 L 685 145"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeOpacity="0.75"
              markerEnd="url(#cyan-arrow)"
            />

            {/* 3. Snake turn: 03 ↓ across gap to 04 ↓ */}
            <path
              d="M 845 285 C 845 300, 835 305, 810 305 L 180 305 C 160 305, 155 310, 155 325"
              fill="none"
              stroke="url(#pipe-gradient)"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeOpacity="0.75"
              markerEnd="url(#cyan-arrow)"
            />

            {/* 4. Row 2: 04 ──→ 05 */}
            <path
              d="M 310 465 L 340 465"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeOpacity="0.75"
              markerEnd="url(#cyan-arrow)"
            />

            {/* 5. Row 2: 05 ──→ 06 */}
            <path
              d="M 655 465 L 685 465"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeOpacity="0.75"
              markerEnd="url(#cyan-arrow)"
            />
          </svg>

          {/* 3 × 2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {validationStages.map((stage) => (
              <ValidationCard
                key={stage.id}
                stage={stage}
                isActive={activeStageId === stage.id}
                onClick={() => handleCardClick(stage.id)}
              />
            ))}
          </div>
        </div>

        {/* Scientific Note Banner */}
        <div className="mt-12 p-4 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200 dark:border-slate-800/90 text-xs text-slate-600 dark:text-slate-400 flex items-start sm:items-center gap-3 font-mono shadow-xs">
          <span className="px-2.5 py-1 rounded bg-cyan-100/90 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-400 font-bold shrink-0">
            RESEARCH INTEGRITY
          </span>
          <p className="leading-relaxed">
            The system does not assert automatic superiority of chained models; rather, it provides an automated experimental testbed to quantitatively benchmark and compare each generation strategy.
          </p>
        </div>
      </div>

      {/* CardSwap Detail Modal Panel */}
      <ValidationDetailModal
        isOpen={isDetailOpen}
        initialStageId={activeStageId}
        stages={validationStages}
        onClose={() => setIsDetailOpen(false)}
        onSelectStage={(id) => setActiveStageId(id)}
      />
    </section>
  );
};
