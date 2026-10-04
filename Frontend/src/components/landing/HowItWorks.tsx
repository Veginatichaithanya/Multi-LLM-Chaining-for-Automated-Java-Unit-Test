import React, { useState } from 'react';
import { Search, Sparkles, CheckSquare, RefreshCw, ArrowRight, Layers, MousePointerClick } from 'lucide-react';
import { CardSwap, Card } from '../ui/CardSwap';

export const HowItWorks: React.FC = () => {
  const [activeStage, setActiveStage] = useState(0);

  const steps = [
    {
      step: '01',
      title: 'Analyze',
      description: 'Analyze Java classes, methods, parameters and structure.',
      detail: 'Parses Abstract Syntax Trees (AST) using JavaParser to inspect control flows, exception signatures, and conditional branch targets.',
      icon: Search,
      badge: 'Static Code Analysis',
      badgeColor: 'border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold',
      iconBoxColor: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      step: '02',
      title: 'Generate',
      description: 'Generate initial JUnit 5 tests using the first LLM.',
      detail: 'Injects class context and method contracts into Gemini 1.5 Pro to generate syntactically complete JUnit 5 test cases with realistic assertions.',
      icon: Sparkles,
      badge: 'Initial Synthesis',
      badgeColor: 'border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold',
      iconBoxColor: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/60',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      step: '03',
      title: 'Validate',
      description: 'Compile and execute the generated tests and measure coverage.',
      detail: 'Runs isolated Maven Surefire test passes, catching compilation faults and runtime failures while recording JaCoCo line & branch metrics.',
      icon: CheckSquare,
      badge: 'Real Execution',
      badgeColor: 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold',
      iconBoxColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      step: '04',
      title: 'Refine',
      description: 'Use failures and coverage gaps to improve the test suite.',
      detail: 'Feeds compiler error logs, assertion tracebacks, and uncovered branch offsets into OpenAI for targeted test healing and gap elimination.',
      icon: RefreshCw,
      badge: 'Iterative Chaining',
      badgeColor: 'border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold',
      iconBoxColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 relative bg-slate-50/50 dark:bg-[#070a10] border-t border-slate-200/80 dark:border-slate-800/80 overflow-hidden" id="how-it-works">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[450px] bg-cyan-950/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:bg-slate-900 border border-cyan-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 mb-4 font-semibold shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>PIPELINE ARCHITECTURE</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            From Java Source to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-cyan-400 dark:to-teal-300">
              Validated Tests
            </span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            A structured 4-stage pipeline combining static analysis, LLM generation, real compiler execution, and iterative gap-driven refinement.
          </p>
        </div>

        {/* Responsive Layout: Stage Overview Rail (Left) + Animated CardSwap Deck (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Stage Navigation & Live Indicator */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Pipeline Stages Overview</span>
              <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1 text-[11px] font-semibold">
                <MousePointerClick className="w-3.5 h-3.5" />
                Hover to pause • Click to swap
              </span>
            </div>

            <div className="space-y-2.5">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isCurrent = activeStage === idx;
                return (
                  <div
                    key={step.step}
                    className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-cyan-50/70 via-white to-white dark:bg-[#0d1320] border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/30 translate-x-1.5'
                        : 'bg-white/80 dark:bg-[#090d16]/70 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs transition-colors border ${
                        isCurrent
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-transparent shadow-xs shadow-cyan-500/30'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {step.step}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {step.title}
                        </h4>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {step.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-slate-500">
                      <Icon className={`w-4 h-4 ${isCurrent ? step.iconColor : 'text-slate-400 dark:text-slate-600'}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Counter Footnote */}
            <div className="pt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between">
              <span>Automatic card swap cycle: 4.0s</span>
              <span className="text-cyan-600 dark:text-cyan-400/80 font-semibold">STAGE 0{activeStage + 1} OF 04 ACTIVE</span>
            </div>
          </div>

          {/* Right Column: Prominent Animated CardSwap Stack */}
          <div className="lg:col-span-7 flex justify-center items-center py-6 sm:py-8 overflow-hidden">
            {/* Responsive scaling wrapper to guarantee zero horizontal overflow on mobile */}
            <div className="w-full flex justify-center items-center overflow-visible">
              <div className="origin-top transform scale-[0.74] sm:scale-[0.88] md:scale-95 lg:scale-100 transition-transform">
                <CardSwap
                  width={340}
                  height={480}
                  cardDistance={45}
                  verticalDistance={55}
                  delay={4000}
                  pauseOnHover={true}
                  skewAmount={4}
                  easing="elastic"
                  onCardChange={(newIdx) => setActiveStage(newIdx)}
                >
                  {steps.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Card
                        key={item.step}
                        className="bg-white dark:bg-[#0b0f17] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-xl shadow-slate-200/60 dark:shadow-2xl dark:shadow-cyan-950/40 hover:border-cyan-500/60 transition-colors group relative overflow-hidden"
                      >
                        {/* Top Gradient Accent line */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-400 -mt-6 sm:-mt-7 -mx-6 sm:-mx-7 mb-5" />

                        {/* Top: Large stage number (left) & Stage icon (right) */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-3xl font-black bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-teal-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                            {item.step}
                          </span>
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-xs border ${item.iconBoxColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Middle Content */}
                        <div className="my-auto py-3">
                          {/* Below: Stage badge */}
                          <div className="mb-3">
                            <span className={`inline-block text-[11px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          </div>

                          {/* Then: Stage title */}
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                            {item.title}
                          </h3>

                          {/* Then: Short description */}
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug mb-3">
                            {item.description}
                          </p>

                          {/* Then: Detailed explanation */}
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>

                        {/* Bottom: STAGE X OF 4 indicator & Arrow */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                          <span className="font-semibold tracking-wider">STAGE {idx + 1} OF 4</span>
                          <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Card>
                    );
                  })}
                </CardSwap>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
