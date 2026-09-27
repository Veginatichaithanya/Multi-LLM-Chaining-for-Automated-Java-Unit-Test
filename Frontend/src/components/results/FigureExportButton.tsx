/**
 * FigureExportButton.tsx
 *
 * High-resolution PNG export component for research figures & charts.
 * Powered by html2canvas-pro with full native support for modern CSS (oklch, oklab),
 * explicit SVG dimension preservation for Recharts, and automated theme background detection.
 * Includes a direct SVG-to-canvas fallback to guarantee zero export failures.
 */

import React, { useState } from 'react';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';

interface FigureExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
  label?: string;
  backgroundColor?: string | null;
}

/**
 * Resolves the appropriate background color for the exported PNG.
 * If not specified, traverses upward to find the closest solid surface background,
 * or adapts to the current light/dark theme.
 */
function resolveBackgroundColor(element: HTMLElement | null, explicitBg?: string | null): string {
  if (explicitBg !== undefined && explicitBg !== null) {
    return explicitBg;
  }
  let curr: HTMLElement | null = element;
  while (curr && curr !== document.documentElement && curr !== document.body) {
    const bg = window.getComputedStyle(curr).backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    curr = curr.parentElement;
  }
  const isDark =
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark');
  return isDark ? '#0d1117' : '#ffffff';
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            triggerDownload(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          } else {
            const dataUrl = canvas.toDataURL('image/png');
            triggerDownload(dataUrl, filename);
            resolve();
          }
        }, 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        triggerDownload(dataUrl, filename);
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Direct SVG fallback export if html2canvas cannot complete.
 */
async function exportViaSvgDirect(
  container: HTMLElement,
  filename: string,
  bgColor: string
): Promise<boolean> {
  const svg = container.querySelector<SVGElement>('svg');
  if (!svg) return false;

  const rect = svg.getBoundingClientRect();
  const width = Math.max(rect.width || 800, 400);
  const height = Math.max(rect.height || 400, 200);
  const scale = 2;

  const clonedSvg = svg.cloneNode(true) as SVGElement;
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('width', `${width}`);
  clonedSvg.setAttribute('height', `${height}`);

  const xml = new XMLSerializer().serializeToString(clonedSvg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG for direct fallback export'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    await downloadCanvas(canvas, filename);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const FigureExportButton: React.FC<FigureExportButtonProps> = ({
  targetRef,
  filename = 'figure.png',
  label = 'Export PNG',
  backgroundColor,
}) => {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (!targetRef.current || status === 'exporting') return;
    setStatus('exporting');

    const targetEl = targetRef.current;
    const bgColor = resolveBackgroundColor(targetEl, backgroundColor);

    try {
      // 1. Primary export using html2canvas-pro (supports modern CSS & oklch)
      const canvas = await html2canvas(targetEl, {
        scale: 2, // 2x provides crisp print-grade graphics without memory bloat
        backgroundColor: bgColor,
        useCORS: true,
        logging: false,
        allowTaint: false,
        onclone: (_clonedDoc, clonedElement) => {
          if (!targetEl || !clonedElement) return;

          // Preserve exact container bounding box dimensions
          const rect = targetEl.getBoundingClientRect();
          if (rect.width > 0) {
            clonedElement.style.width = `${rect.width}px`;
            clonedElement.style.minWidth = `${rect.width}px`;
          }
          if (rect.height > 0) {
            clonedElement.style.height = `${rect.height}px`;
            clonedElement.style.minHeight = `${rect.height}px`;
          }

          // Ensure all child SVGs (Recharts) have explicit pixel width and height
          const originalSvgs = targetEl.querySelectorAll('svg');
          const clonedSvgs = clonedElement.querySelectorAll('svg');
          originalSvgs.forEach((origSvg, idx) => {
            const clonedSvg = clonedSvgs[idx];
            if (clonedSvg) {
              const svgRect = origSvg.getBoundingClientRect();
              const w = svgRect.width || parseFloat(origSvg.getAttribute('width') || '0');
              const h = svgRect.height || parseFloat(origSvg.getAttribute('height') || '0');
              if (w > 0) {
                clonedSvg.setAttribute('width', `${w}`);
                clonedSvg.style.width = `${w}px`;
              }
              if (h > 0) {
                clonedSvg.setAttribute('height', `${h}`);
                clonedSvg.style.height = `${h}px`;
              }

              // Adjust parent wrapper if recharts-responsive-container
              const parent = clonedSvg.parentElement;
              if (parent && parent.classList.contains('recharts-wrapper')) {
                parent.style.width = `${w}px`;
                parent.style.height = `${h}px`;
              }
            }
          });
        },
      });

      await downloadCanvas(canvas, filename);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (primaryErr) {
      console.warn('[FigureExportButton] html2canvas-pro failed, attempting direct SVG fallback:', primaryErr);
      try {
        const fallbackSuccess = await exportViaSvgDirect(targetEl, filename, bgColor);
        if (fallbackSuccess) {
          setStatus('success');
          setTimeout(() => setStatus('idle'), 2000);
          return;
        }
        throw new Error('Fallback SVG export did not find any SVG element.');
      } catch (fallbackErr) {
        console.error('[FigureExportButton] All export methods failed:', fallbackErr);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={status === 'exporting'}
      title={`Export ${filename}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        status === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          : status === 'error'
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700/80 hover:text-white dark:bg-slate-800/80 dark:text-slate-200'
      }`}
    >
      {status === 'exporting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
      {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
      {status === 'idle' && <Download className="w-3.5 h-3.5" />}

      {status === 'exporting' && 'Exporting…'}
      {status === 'success' && 'Exported!'}
      {status === 'error' && 'Export Failed'}
      {status === 'idle' && label}
    </button>
  );
};
