/**
 * ResearchFigureModal.tsx
 *
 * Full-screen white-background overlay designed for IEEE-paper screenshot capture.
 * Hides navigation and all decorative UI elements.
 * Renders the figure title, the chart, and the official caption.
 */

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { FigureExportButton } from './FigureExportButton';

interface ResearchFigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  figureNumber: string;
  title: string;
  caption: string;
  filename: string;
  children: React.ReactNode;
}

export const ResearchFigureModal: React.FC<ResearchFigureModalProps> = ({
  isOpen,
  onClose,
  figureNumber,
  title,
  caption,
  filename,
  children,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${figureNumber} — ${title}`}
    >
      {/* Modal shell */}
      <div className="relative w-full max-w-4xl mx-4 max-h-[95vh] overflow-y-auto">
        {/* Control bar (outside the captured region) */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-slate-400 font-mono">
            Research Figure Mode — white background, print-ready
          </span>
          <div className="flex items-center gap-2">
            <FigureExportButton targetRef={captureRef} filename={filename} />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer"
              aria-label="Close figure"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Captured region — white background, academic typography */}
        <div
          ref={captureRef}
          className="bg-white rounded-xl p-8 shadow-2xl"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* Figure number + title */}
          <h2
            className="text-center text-base font-bold mb-1"
            style={{ color: '#1a1a1a', fontFamily: "'Times New Roman', Times, serif" }}
          >
            {figureNumber}. {title}
          </h2>

          {/* Chart area */}
          <div className="my-6">{children}</div>

          {/* Caption */}
          <p
            className="text-center text-sm mt-4 text-slate-700"
            style={{
              color: '#333',
              fontFamily: "'Times New Roman', Times, serif",
              maxWidth: '680px',
              margin: '0 auto',
            }}
          >
            {caption.startsWith(figureNumber) ? (
              <>
                <span className="font-semibold">{figureNumber}.</span>{' '}
                {caption.slice(figureNumber.length).replace(/^[:.\s]+/, '')}
              </>
            ) : (
              <>
                <span className="font-semibold">{figureNumber}.</span> {caption}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
