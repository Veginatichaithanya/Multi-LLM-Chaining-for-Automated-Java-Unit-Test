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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-medium tracking-wide mb-6 shadow-sm shadow-cyan-950/40">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>AI-POWERED JAVA TESTING</span>
          <span className="text-cyan-600">/</span>
          <span className="text-slate-400">RESEARCH EXPERIMENT</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Generate{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 decoration-cyan-500 underline underline-offset-8 decoration-wavy decoration-1">
            Better Java Unit Tests
          </span>
          .<br />
          Automatically.
        </h1>

        {/* Supporting Text */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Generate, validate, measure, and refine JUnit 5 tests through a multi-LLM testing pipeline.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onStartClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            id="hero-primary-cta"
          >
            <span>Start Generating Tests</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSeeHowItWorksClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm border border-slate-700/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            id="hero-secondary-cta"
          >
            <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
            <span>See How It Works</span>
          </button>
        </div>

        {/* Developer Trust Micro-tags */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>No Synthesized Assumptions</span>
          </div>
          <span className="hidden sm:inline text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
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
