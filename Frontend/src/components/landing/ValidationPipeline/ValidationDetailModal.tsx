import React, { useEffect, useState } from 'react';
import { X, ArrowRight, CheckCircle2, ShieldCheck, Terminal, Layers } from 'lucide-react';
import { CardSwap, Card } from '../../ui/CardSwap';
import type { ValidationStageData } from './ValidationCard';

interface ValidationDetailModalProps {
  isOpen: boolean;
  initialStageId: number;
  stages: ValidationStageData[];
  onClose: () => void;
  onSelectStage: (id: number) => void;
}

export const ValidationDetailModal: React.FC<ValidationDetailModalProps> = ({
  isOpen,
  initialStageId,
  stages,
  onClose,
  onSelectStage,
}) => {
  const [selectedId, setSelectedId] = useState(initialStageId);

  useEffect(() => {
    setSelectedId(initialStageId);
  }, [initialStageId]);

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

  const currentStage = stages.find((s) => s.id === selectedId) || stages[0];
  const CurrentIcon = currentStage.icon;
  const initialIndex = stages.findIndex((s) => s.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-detail-title"
    >
      <div
        className="w-full max-w-5xl rounded-3xl bg-[#090d16] border border-slate-700/80 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 relative my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Controls */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                Stage Deep Dive
              </span>
              <h3 id="validation-detail-title" className="text-base font-bold text-white leading-tight">
                Validation Pipeline Stage 0{currentStage.id}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="Close stage details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Stage Specifications */}
          <div className="lg:col-span-6 space-y-5 text-left">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-cyan-400 font-black">STAGE 0{currentStage.id}</span>
                <span className="text-slate-600">•</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${currentStage.badgeColor}`}>
                  {currentStage.badge}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <CurrentIcon className="w-6 h-6 text-cyan-400" />
                <span>{currentStage.title}</span>
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-200 leading-snug">
                {currentStage.description}
              </p>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {currentStage.details}
              </p>
            </div>

            {/* Technical Pipeline Artifacts */}
            <div className="rounded-xl bg-[#050810] border border-slate-800 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 text-[11px] block">Input Stream:</span>
                  <span>{currentStage.technicalSpecs.input}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 text-[11px] block">Gate Criteria:</span>
                  <span>{currentStage.technicalSpecs.gateCriteria}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 text-[11px] block">Output Artifact:</span>
                  <span>{currentStage.technicalSpecs.output}</span>
                </div>
              </div>
            </div>

            {/* Stage Selector Pills 01 -> 06 */}
            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-2">
                Direct Stage Jump:
              </span>
              <div className="flex flex-wrap gap-2">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(s.id);
                      onSelectStage(s.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      s.id === selectedId
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    0{s.id}. {s.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: CardSwap Interactive 6-Card Deck */}
          <div className="lg:col-span-6 flex justify-center items-center py-4 overflow-hidden">
            <div className="origin-top transform scale-[0.80] sm:scale-[0.88] md:scale-95 transition-transform">
              <CardSwap
                key={initialIndex}
                width={330}
                height={450}
                cardDistance={35}
                verticalDistance={45}
                delay={4500}
                pauseOnHover={true}
                skewAmount={3}
                easing="elastic"
                initialIndex={initialIndex >= 0 ? initialIndex : 0}
                onCardChange={(newIdx) => {
                  const targetStage = stages[newIdx];
                  if (targetStage) {
                    setSelectedId(targetStage.id);
                    onSelectStage(targetStage.id);
                  }
                }}
              >
                {stages.map((stageItem) => {
                  const SIcon = stageItem.icon;
                  return (
                    <Card
                      key={stageItem.id}
                      className="bg-[#0c121f] border border-slate-700 p-6 shadow-2xl shadow-cyan-950/60 flex flex-col justify-between"
                    >
                      {/* Top */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-3xl font-black text-slate-600">
                          0{stageItem.id}
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-sm">
                          <SIcon className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="my-auto py-2 text-left">
                        <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border mb-2.5 ${stageItem.badgeColor}`}>
                          {stageItem.badge}
                        </span>
                        <h4 className="text-lg font-bold text-white mb-1.5">
                          {stageItem.title}
                        </h4>
                        <p className="text-xs font-semibold text-slate-200 leading-snug mb-2">
                          {stageItem.description}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {stageItem.details}
                        </p>
                      </div>

                      {/* Bottom */}
                      <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>STAGE 0{stageItem.id} OF 06</span>
                        <ArrowRight className="w-4 h-4 text-cyan-400" />
                      </div>
                    </Card>
                  );
                })}
              </CardSwap>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-500 gap-2">
          <span>CardSwap navigation active (01 → 02 → 03 → 04 → 05 → 06)</span>
          <button
            type="button"
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            Back to Overview Grid
          </button>
        </div>
      </div>
    </div>
  );
};
