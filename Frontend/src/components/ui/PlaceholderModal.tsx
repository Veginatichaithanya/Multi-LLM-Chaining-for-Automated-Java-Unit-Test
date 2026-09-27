import React, { useEffect } from 'react';
import { X, Cpu, CheckCircle2, Clock } from 'lucide-react';

interface PlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlaceholderModal: React.FC<PlaceholderModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="w-full max-w-lg rounded-2xl bg-[#0d121c] border border-slate-700/80 p-6 sm:p-7 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              Implementation Phase 1
            </span>
            <h3 id="modal-title" className="text-lg font-bold text-white leading-tight">
              TestForge AI Workspace
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
          You are exploring the <strong className="text-white">Phase 1 Landing Page</strong>. Per the development roadmap, the core architecture is presented in showcase mode.
        </p>

        {/* Roadmap items */}
        <div className="space-y-2.5 rounded-xl bg-[#070a10] border border-slate-800/90 p-3.5 mb-6 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300">Phase 2 Scheduled Connectors:</span>
            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" /> Scheduled
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Java Project Upload &amp; Repository Scanner</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Gemini 1.5 &amp; OpenAI GPT-4o API Integration</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Local Maven &amp; JaCoCo Execution Sandbox</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Interactive Empirical Benchmark Dashboard</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Explore Landing Page
          </button>
        </div>
      </div>
    </div>
  );
};
