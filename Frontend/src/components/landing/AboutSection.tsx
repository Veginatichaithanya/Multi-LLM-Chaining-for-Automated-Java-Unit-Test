import React from 'react';
import { GraduationCap, BookOpen, Target, Layers } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section className="py-20 sm:py-24 px-4 bg-[#080b13] border-t border-slate-800/80" id="about">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>RESEARCH OVERVIEW</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Multi-LLM Chaining for Automated Java Unit Test Generation and Refinement
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Modern LLMs can draft unit tests quickly, but often produce hallucinated methods, broken assertions, or incomplete branch coverage. 
              <strong className="text-white font-medium"> TestForge AI</strong> investigates whether an execution-guided pipeline—combining compiler feedback, JVM execution, JaCoCo coverage telemetry, and a secondary refinement LLM—can measurably improve test suite validity and coverage.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">The Problem</h4>
                  <p className="text-xs text-slate-400">Raw generative AI outputs frequently suffer from syntax mismatches and superficial test paths that fail to exercise critical edge cases.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">The Research Objective</h4>
                  <p className="text-xs text-slate-400">Quantitatively measure line, branch, and instruction coverage improvements when chaining Gemini and OpenAI through actual Maven test execution.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Highlights */}
          <div className="lg:col-span-6 rounded-2xl bg-[#0a0f1a] border border-slate-800 p-6 sm:p-8 shadow-xl">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Project Technical Pillars</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">01. Parsing</span>
                <span className="text-slate-300">JavaParser AST extraction for class signatures and method parameters.</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-teal-400 font-bold block mb-1">02. Synthesis</span>
                <span className="text-slate-300">Targeted prompt construction for JUnit 5 test generation.</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">03. Execution</span>
                <span className="text-slate-300">Maven Surefire JVM harness for actual test execution.</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-purple-400 font-bold block mb-1">04. Profiling</span>
                <span className="text-slate-300">JaCoCo bytecode instrumentation for unexercised branch mapping.</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>ACADEMIC DISCIPLINE</span>
              <span className="text-slate-300">Computer Science / Software Engineering</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
