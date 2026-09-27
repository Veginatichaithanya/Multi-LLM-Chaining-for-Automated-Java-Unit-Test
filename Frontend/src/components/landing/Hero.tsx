import React from 'react';
import { ArrowRight, Play, Terminal, ShieldCheck } from 'lucide-react';
import WebThreads from '../ui/WebThreads';
import { PipelineVisualization } from './PipelineVisualization';
import { useTheme } from '../../context/ThemeContext';

interface HeroProps {
  onStartClick: () => void;
  onSeeHowItWorksClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartClick, onSeeHowItWorksClick }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 overflow-hidden" id="hero">
      {/* Background WebThreads Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0 overflow-hidden">
        <WebThreads
          color1={isDark ? "#06b6d4" : "#0284c7"}
          color2={isDark ? "#6366f1" : "#4f46e5"}
          color3={isDark ? "#ffffff" : "#0ea5e9"}
          speed={0.15}
          threadCount={6}
          frequency={4.0}
          spread={0.22}
          taper={0.9}
          position={0.35}
          fanMode="center"
          glow={0.015}
          falloff={0.65}
          thickness={0.9}
          brightness={0.45}
          opacity={isDark ? 0.65 : 0.35}
          mirror={true}
          shimmer={false}
          grain={true}
          grainIntensity={0.04}
          mouseInteraction={true}
          mouseStrength={0.25}
          lightMode={!isDark}
        />
      </div>

      {/* Subtle Radial Glow & Grid Background */}
      <div className="absolute inset-0 bg-dev-grid opacity-20 pointer-events-none z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-radial-gradient pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Small Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full dark:bg-cyan-950/50 dark:border-cyan-800/60 dark:text-cyan-300 bg-cyan-50 border-cyan-200 text-cyan-800 text-xs font-mono font-medium tracking-wide mb-6 shadow-sm shadow-cyan-950/40">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <span>AI-POWERED JAVA TESTING</span>
          <span className="dark:text-cyan-600 text-cyan-400">/</span>
          <span className="dark:text-slate-400 text-slate-500">RESEARCH EXPERIMENT</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight dark:text-white text-slate-900 max-w-4xl mx-auto leading-[1.15]">
          Generate{' '}
          <span className="text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 decoration-cyan-500 underline underline-offset-8 decoration-wavy decoration-1">
            Better Java Unit Tests
          </span>
          .<br />
          Automatically.
        </h1>

        {/* Supporting Text */}
        <p className="mt-6 text-base sm:text-lg md:text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Generate, validate, measure, and refine JUnit 5 tests through a multi-LLM testing pipeline.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onStartClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            id="hero-primary-cta"
          >
            <span>Start Generating Tests</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSeeHowItWorksClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-slate-700/80 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 border border-slate-300 font-medium text-sm transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            id="hero-secondary-cta"
          >
            <Play className="w-3.5 h-3.5 fill-current text-cyan-500" />
            <span>See How It Works</span>
          </button>
        </div>

        {/* Developer Trust Micro-tags */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-mono dark:text-slate-400 text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>No Synthesized Assumptions</span>
          </div>
          <span className="hidden sm:inline dark:text-slate-700 text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-500" />
            <span>Real Compiler Sandbox</span>
          </div>
        </div>

        {/* Pipeline Visualization Panel */}
        <div className="text-left">
          <PipelineVisualization />
        </div>
      </div>
    </section>
  );
};
