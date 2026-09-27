import React from 'react';
import { Sparkles, Cpu, GitMerge, FileSpreadsheet, Info } from 'lucide-react';

export const ResearchSection: React.FC = () => {
  const pipelines = [
    {
      id: 'gemini-alone',
      name: 'Gemini Standalone',
      type: 'Single-LLM Baseline',
      model: 'Gemini 1.5 Pro',
      icon: Sparkles,
      iconColor: 'text-cyan-400',
      badgeColor: 'border-cyan-800/60 bg-cyan-950/40 text-cyan-300',
      description: 'Generates unit tests in a single inference pass without automated feedback or compiler healing.',
    },
    {
      id: 'openai-alone',
      name: 'OpenAI Standalone',
      type: 'Single-LLM Baseline',
      model: 'GPT-4o',
      icon: Cpu,
      iconColor: 'text-purple-400',
      badgeColor: 'border-purple-800/60 bg-purple-950/40 text-purple-300',
      description: 'Standard prompt-based generation pass directly from Java source code without chained refinement.',
    },
    {
      id: 'chained',
      name: 'Chained Pipeline',
      type: 'Multi-LLM Chaining',
      model: 'Gemini → Execution → OpenAI',
      icon: GitMerge,
      iconColor: 'text-emerald-400',
      badgeColor: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300',
      description: 'Initial tests from Gemini are validated via JUnit 5 & JaCoCo; errors & coverage gaps are fed into OpenAI.',
    },
  ];

  const metrics = [
    { name: 'Generated test count', tool: 'AST count', description: 'Total synthetic test methods produced' },
    { name: 'Compilation success', tool: 'javac / Maven', description: 'Tests passing bytecode compilation without syntax/type errors' },
    { name: 'Test execution results', tool: 'Surefire Runner', description: 'Assertions passing against actual runtime behavior' },
    { name: 'Line coverage', tool: 'JaCoCo', description: 'Percentage of executable code lines traversed' },
    { name: 'Branch coverage', tool: 'JaCoCo', description: 'Percentage of conditional branches (if/else/switch) exercised' },
    { name: 'Instruction coverage', tool: 'JaCoCo', description: 'Bytecode level instruction execution ratio' },
    { name: 'Mutation score', tool: 'PIT Mutation', description: 'Ratio of injected code mutants detected and killed by tests' },
    { name: 'Execution time', tool: 'Benchmark timer', description: 'Wall-clock time for generation and validation lifecycle' },
    { name: 'Refinement iterations', tool: 'Pipeline counter', description: 'Cycles required to resolve diagnostic errors' },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 bg-[#070a12] border-t border-slate-800/80" id="research">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 mb-4">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>EMPIRICAL EVALUATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built as a Research Experiment
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
            The project evaluates whether chaining multiple LLMs through an execution-grounded feedback loop produces higher quality test suites compared to single-model baselines.
          </p>
        </div>

        {/* 3 Pipeline Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {pipelines.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="rounded-2xl bg-[#0a0e18] border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${p.badgeColor}`}>
                      {p.type}
                    </span>
                    <Icon className={`w-5 h-5 ${p.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
                  <div className="text-xs font-mono text-cyan-400/90 mb-3">{p.model}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>BASELINE CATEGORY</span>
                  <span className="text-slate-300">Target Candidate</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Research Metrics Matrix Table */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 bg-[#0b101c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Experimental Evaluation Matrix</span>
                <span className="text-xs font-mono text-slate-400 font-normal hidden sm:inline">
                  (Quantitative Metrics Framework)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Variables monitored across single-model baselines and chained refinement runs.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-full">
              <Info className="w-3.5 h-3.5" />
              <span>Awaiting experimental trial benchmarks</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080c14] text-slate-400">
                  <th className="py-3 px-4 font-semibold">Evaluation Metric</th>
                  <th className="py-3 px-4 font-semibold">Measurement Tool</th>
                  <th className="py-3 px-4 font-semibold text-center">Gemini Baseline</th>
                  <th className="py-3 px-4 font-semibold text-center">OpenAI Baseline</th>
                  <th className="py-3 px-4 font-semibold text-center text-cyan-300">Gemini → OpenAI Chained</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {metrics.map((m, idx) => (
                  <tr
                    key={m.name}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-[#090d16]' : 'bg-[#080c14]/70'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-sans font-semibold text-slate-200">{m.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700/60 text-[11px]">
                        {m.tool}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800/80">--</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800/80">--</span>
                    </td>
                    <td className="py-3 px-4 text-center text-cyan-400 font-semibold">
                      <span className="px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-800/60 text-[11px]">
                        Measured during experiments
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#070b12] border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>Standardized dataset: Defect4J / Open-source Java modules</span>
            <span className="text-slate-400">Zero synthetic or unverified claims displayed</span>
          </div>
        </div>
      </div>
    </section>
  );
};
