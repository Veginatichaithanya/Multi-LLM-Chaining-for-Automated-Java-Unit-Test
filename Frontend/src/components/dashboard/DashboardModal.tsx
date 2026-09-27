import React, { useEffect } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
}) => {
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
      aria-labelledby="dashboard-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#0b101c] border border-slate-700/80 p-6 sm:p-7 shadow-2xl shadow-cyan-950/40 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
              Implementation Phase 2
            </span>
            <h3 id="dashboard-modal-title" className="text-base font-bold text-white leading-tight">
              {title}
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          {description}
        </p>

        {/* Phase 2 Implementation Timeline */}
        <div className="space-y-2 rounded-xl bg-[#050810] border border-slate-800/90 p-3.5 mb-5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300">Phase 2 Status:</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>PostgreSQL &amp; SQLAlchemy Connected</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Project &amp; Source REST APIs Active</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Gemini &amp; GPT-4o Multi-LLM Pipeline Ready</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
          <a
            href="/projects"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              window.location.href = '/projects';
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
          >
            <span>Open Projects</span>
          </a>
        </div>
      </div>
    </div>
  );
};
