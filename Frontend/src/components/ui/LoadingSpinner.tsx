import React from 'react';
import { Cpu } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  fullscreen?: boolean;
}

export const PageLoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading workspace...',
  fullscreen = true,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-[#07090e] text-slate-200 select-none ${
        fullscreen ? 'min-h-screen w-full fixed inset-0 z-50' : 'p-12 w-full'
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Ambient glow */}
        <div className="absolute w-24 h-24 rounded-full bg-cyan-500/15 blur-xl animate-pulse" />

        {/* Outer spinning ring */}
        <div className="w-16 h-16 rounded-full border-2 border-cyan-950 border-t-cyan-400 border-r-teal-400 animate-spin" />

        {/* Inner pulsing chip icon */}
        <div className="absolute w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-sm animate-pulse">
          <Cpu className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-1 font-mono text-xs text-slate-400">
        <span className="text-slate-300 font-semibold tracking-wide">{label}</span>
        <span className="text-[11px] text-cyan-400/80 animate-pulse">TestForge AI</span>
      </div>
    </div>
  );
};
