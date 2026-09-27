import React, { useState } from 'react';
import { 
  RefreshCw, 
  Terminal, 
  PlayCircle, 
  Activity, 
  AlertOctagon, 
  Sparkles, 
  CheckCircle, 
  ArrowDown, 
  Repeat 
} from 'lucide-react';

export const RefinementLoop: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<number>(4);

  const loopNodes = [
    {
      id: 1,
      name: 'Generated Tests',
      subtext: 'LLM 1 Initial Candidate Suite',
      icon: Sparkles,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBoxColor: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/60',
      badgeColor: 'border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold',
      badge: 'Synthesized',
      payload: 'Generated 5 @Test cases from Gemini 1.5 Pro with standard mocking constructs and parameter declarations.',
      exampleSnippet: `// Candidate Test Method #3
@Test
void testOrderFulfillment_OutdatedStock() {
  Order order = new Order("SKU-992", 5);
  fulfillmentService.dispatch(order); // Missing repository mock
}`,
    },
    {
      id: 2,
      name: 'Compile',
      subtext: 'javac Bytecode Check',
      icon: Terminal,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBoxColor: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/60',
      badgeColor: 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold',
      badge: 'Compiler Gate',
      payload: 'Identifies missing type imports, symbol resolution failures, and invalid method invocations before runtime.',
      exampleSnippet: `[javac COMPILATION CHECK]
[SUCCESS] PaymentServiceTest.java compiled without error.
All referenced dependencies match project classpath.`,
    },
    {
      id: 3,
      name: 'Execute',
      subtext: 'Maven Surefire JVM Run',
      icon: PlayCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBoxColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
      badgeColor: 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold',
      badge: 'JVM Runtime',
      payload: 'Runs test methods in an isolated JVM. Records assertion results and unexpected NullPointer or Mock exceptions.',
      exampleSnippet: `[SUREFIRE TEST RUN]
Running com.forge.FulfillmentServiceTest
Tests run: 5, Failures: 1, Errors: 0
Failure in testOrderFulfillment_OutdatedStock():
NullPointerException: repository was null at line 34`,
    },
    {
      id: 4,
      name: 'Measure Coverage',
      subtext: 'JaCoCo Bytecode Inspection',
      icon: Activity,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBoxColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
      badgeColor: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold',
      badge: 'Metrics Profiling',
      payload: 'Injects bytecode probes to record exact branch paths and instruction counts traversed during execution.',
      exampleSnippet: `[JACOCO EXEC REPORT]
Class: FulfillmentService
Lines Covered: 82% (41 of 50)
Branches Covered: 60% (3 of 5)
Uncovered probe at instruction index 18:
-> Branch condition (stockLevel < requestedQty) NEVER EXERCISED`,
    },
    {
      id: 5,
      name: 'Find Errors / Coverage Gaps',
      subtext: 'Diagnostic Trace Extraction',
      icon: AlertOctagon,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBoxColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
      badgeColor: 'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold',
      badge: 'Gap Isolation',
      payload: 'Distills raw execution logs and JaCoCo coverage reports into an actionable diagnostic payload for LLM 2.',
      exampleSnippet: `[DIAGNOSTIC SYNTHESIS]
1. Runtime Failure: Mock repository instance not initialized.
2. Coverage Gap: Missing test case for insufficient inventory condition.
Payload prepared for Refinement LLM prompt context.`,
    },
    {
      id: 6,
      name: 'LLM Refinement',
      subtext: 'OpenAI Prompt Refinement',
      icon: Sparkles,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBoxColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60',
      badgeColor: 'border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold',
      badge: 'Targeted Healing',
      payload: 'OpenAI ingests source class, failing test code, stack trace, and missed branch offset to synthesize targeted corrections.',
      exampleSnippet: `// Refined test addressing null mock & exercising uncovered branch
@Test
@DisplayName("Should throw InsufficientStockException when inventory is low")
void testOrderFulfillment_LowInventory() {
  when(inventoryRepo.getStock("SKU-992")).thenReturn(2);
  assertThrows(InsufficientStockException.class, 
    () -> fulfillmentService.dispatch(new Order("SKU-992", 5)));
}`,
    },
    {
      id: 7,
      name: 'Improved Tests',
      subtext: 'Re-validated Suite Pass',
      icon: CheckCircle,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBoxColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
      badgeColor: 'border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold',
      badge: 'Re-Verified',
      payload: 'Refined tests cycle back to Compile and Execute until all gaps are addressed or max iterations are reached.',
      exampleSnippet: `[CYCLE 2 COMPLETE]
All 6 tests passing.
Branch Coverage increased from 60% -> 100%.
Refinement loop terminates with verified test suite.`,
    },
  ];

  const currentNode = loopNodes.find((n) => n.id === selectedNode) || loopNodes[0];
  const CurrentIcon = currentNode.icon;

  return (
    <section className="py-20 sm:py-28 px-4 bg-slate-50/40 dark:bg-[#05070c] border-t border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden" id="refinement-loop">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[500px] bg-cyan-950/15 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:bg-slate-900 border border-cyan-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 mb-4 font-semibold shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>CLOSED-LOOP REFINEMENT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tests Don't Stop at{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 dark:from-cyan-400 dark:to-teal-300">
              Generation.
            </span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base md:text-lg leading-relaxed">
            The pipeline validates generated tests against the real Java execution environment and uses observed failures and coverage gaps for refinement.
          </p>
        </div>

        {/* Main Feedback Loop Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left / Center: Interactive Sequence Flow */}
          <div className="lg:col-span-6 space-y-3">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Refinement Feedback Cycle</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5" />
                Iterative Loop
              </span>
            </div>

            <div className="space-y-2 relative">
              {loopNodes.map((node, index) => {
                const Icon = node.icon;
                const isSelected = selectedNode === node.id;
                return (
                  <div key={node.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedNode(node.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-50/70 via-white to-white dark:bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/30 translate-x-2'
                          : 'bg-white/80 dark:bg-[#090d16]/80 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-300'
                            : node.iconBoxColor
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            {node.name}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${node.badgeColor}`}>
                            {node.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{node.subtext}</p>
                      </div>
                    </button>

                    {/* Step indicator arrow */}
                    {index < loopNodes.length - 1 && (
                      <div className="flex justify-center my-0.5">
                        <ArrowDown className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loop Return Indicator */}
              <div className="mt-3 p-2.5 rounded-xl border border-dashed border-cyan-300 dark:border-cyan-800/60 bg-gradient-to-r from-cyan-50/80 via-blue-50/50 to-teal-50/80 dark:bg-cyan-950/20 flex items-center justify-center gap-2 text-xs font-mono text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Loops back to Compile & Execute until coverage criteria met</span>
              </div>
            </div>
          </div>

          {/* Right: Stage Diagnostic Inspector Panel */}
          <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#080c14] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            {/* Top gradient accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-teal-400 -mt-5 sm:-mt-6 -mx-5 sm:-mx-6 mb-4" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-xs ${currentNode.iconBoxColor}`}>
                    <CurrentIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wide font-semibold">
                      Loop Stage 0{currentNode.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {currentNode.name}
                    </h3>
                  </div>
                </div>

                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${currentNode.badgeColor}`}>
                  {currentNode.badge}
                </span>
              </div>

              {/* Operational Detail */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {currentNode.payload}
              </p>

              {/* Code Snippet Box */}
              <div className="rounded-xl bg-[#03060a] border border-slate-800/90 p-3.5 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 mb-2 border-b border-slate-900">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Terminal className="w-3 h-3" />
                    Live Trace & Context
                  </span>
                  <span>Diagnostic Data</span>
                </div>
                <pre className="leading-relaxed whitespace-pre font-mono text-[11px] overflow-x-auto text-slate-200">
                  <code>{currentNode.exampleSnippet}</code>
                </pre>
              </div>
            </div>

            {/* Stage Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Deterministic Verification
              </span>
              <span>JUnit 5 + JaCoCo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
