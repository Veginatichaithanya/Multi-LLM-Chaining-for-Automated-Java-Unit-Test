import React from 'react';
import { ArrowRight, FolderUp, CheckCircle2 } from 'lucide-react';

interface FinalCTAProps {
  onGetStartedClick: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onGetStartedClick }) => {
  return (
    <section className="py-20 sm:py-28 px-4 bg-slate-50/50 dark:bg-[#07090e] border-t border-slate-200/80 dark:border-slate-800/80 relative" id="get-started">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/40 dark:bg-gradient-to-b dark:from-[#0e1422] dark:to-[#0a0d16] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 md:p-16 text-center overflow-hidden shadow-2xl shadow-slate-200/80 dark:shadow-cyan-950/20">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 text-xs font-mono mb-6 font-semibold shadow-xs">
              <FolderUp className="w-3.5 h-3.5" />
              <span>AUTOMATED WORKFLOW READY</span>
            </div>

            {/* Heading */}
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Ready to Test Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-cyan-400 dark:to-teal-300">
                Java Project?
              </span>
            </h2>

            {/* Body */}
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed">
              Upload a Java project and explore an automated workflow for test generation, validation, coverage analysis, and refinement.
            </p>

            {/* CTA Button */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={onGetStartedClick}
                className="group hover-lift w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
                id="final-cta-btn"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Verification Features List */}
            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-600 dark:text-slate-400 text-left sm:text-center">
              <div className="flex items-center sm:justify-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zero Hallucinated APIs</span>
              </div>
              <div className="flex items-center sm:justify-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Full JaCoCo Profiling</span>
              </div>
              <div className="flex items-center sm:justify-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>JUnit 5 Native Output</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
