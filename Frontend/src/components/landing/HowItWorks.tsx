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
      badgeColor: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
      iconColor: 'text-blue-400',
    },
    {
      step: '02',
      title: 'Generate',
      description: 'Generate initial JUnit 5 tests using the first LLM.',
      detail: 'Injects class context and method contracts into Gemini 1.5 Pro to generate syntactically complete JUnit 5 test cases with realistic assertions.',
      icon: Sparkles,
      badge: 'Initial Synthesis',
      badgeColor: 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40',
      iconColor: 'text-cyan-400',
    },
    {
      step: '03',
      title: 'Validate',
      description: 'Compile and execute the generated tests and measure coverage.',
      detail: 'Runs isolated Maven Surefire test passes, catching compilation faults and runtime failures while recording JaCoCo line & branch metrics.',
      icon: CheckSquare,
      badge: 'Real Execution',
      badgeColor: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
      iconColor: 'text-amber-400',
    },
    {
      step: '04',
      title: 'Refine',
      description: 'Use failures and coverage gaps to improve the test suite.',
      detail: 'Feeds compiler error logs, assertion tracebacks, and uncovered branch offsets into OpenAI for targeted test healing and gap elimination.',
      icon: RefreshCw,
      badge: 'Iterative Chaining',
      badgeColor: 'text-teal-400 border-teal-800/60 bg-teal-950/40',
      iconColor: 'text-teal-400',
    },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 relative bg-[#070a10] overflow-hidden" id="how-it-works">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[450px] bg-cyan-950/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>PIPELINE ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            From Java Source to Validated Tests
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
            A structured 4-stage pipeline combining static analysis, LLM generation, real compiler execution, and iterative gap-driven refinement.
          </p>
        </div>

        {/* Responsive Layout: Stage Overview Rail (Left) + Animated CardSwap Deck (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Stage Navigation & Live Indicator */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Pipeline Stages Overview</span>
              <span className="text-cyan-400 flex items-center gap-1 text-[11px]">
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
                        ? 'bg-[#0d1320] border-cyan-500/70 shadow-lg shadow-cyan-950/30 translate-x-1.5'
                        : 'bg-[#090d16]/70 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs transition-colors ${
                        isCurrent
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {step.step}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                          {step.title}
                        </h4>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {step.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-slate-500">
                      <Icon className={`w-4 h-4 ${isCurrent ? step.iconColor : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Counter Footnote */}
            <div className="pt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between">
              <span>Automatic card swap cycle: 4.0s</span>
              <span className="text-cyan-400/80 font-semibold">STAGE 0{activeStage + 1} OF 04 ACTIVE</span>
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
                        className="bg-[#0b0f17] border border-slate-800/90 p-6 sm:p-7 shadow-2xl shadow-cyan-950/40 hover:border-cyan-500/60 transition-colors group"
                      >
                        {/* Top: Large stage number (left) & Stage icon (right) */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-3xl font-black text-slate-700 group-hover:text-cyan-400/80 transition-colors">
                            {item.step}
                          </span>
                          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-950/40 group-hover:border-cyan-700/60 transition-all shadow-sm">
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
                          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                            {item.title}
                          </h3>

                          {/* Then: Short description */}
                          <p className="text-sm font-semibold text-slate-200 leading-snug mb-3">
                            {item.description}
                          </p>

                          {/* Then: Detailed explanation */}
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>

                        {/* Bottom: STAGE X OF 4 indicator & Arrow */}
                        <div className="pt-4 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-400">
                          <span className="font-semibold tracking-wider">STAGE {idx + 1} OF 4</span>
                          <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
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
