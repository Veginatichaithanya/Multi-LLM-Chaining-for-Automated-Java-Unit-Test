import React, { useState, useMemo } from 'react';
import Prism from '../../utils/prismJava';
import {
  FileCode2,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface JavaCodeViewerProps {
  fileName: string;
  sourceCode: string;
  fileSizeBytes?: number;
}

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const JavaCodeViewer: React.FC<JavaCodeViewerProps> = ({
  fileName,
  sourceCode,
  fileSizeBytes,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = useMemo(() => sourceCode.split(/\r?\n/), [sourceCode]);
  const lineCount = lines.length;
  const calculatedSize = fileSizeBytes || new Blob([sourceCode]).size;

  const highlightedHtml = useMemo(() => {
    try {
      if (Prism.languages.java) {
        return Prism.highlight(sourceCode, Prism.languages.java, 'java');
      }
    } catch {
      // fallback to plain text if highlighting throws
    }
    return sourceCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }, [sourceCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sourceCode], { type: 'text/x-java-source;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.java') ? fileName : `${fileName}.java`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0F14] overflow-hidden shadow-sm dark:shadow-2xl flex flex-col transition-all duration-300">
      {/* ── Sticky Editor Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-[#0e131b] border-b border-slate-200 dark:border-slate-800/90 text-xs font-mono select-none">
        {/* Left: File Name */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <FileCode2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{fileName}</span>
        </div>

        {/* Right: Meta & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800/80 text-cyan-700 dark:text-cyan-300 border border-slate-300/60 dark:border-slate-700/60 font-medium">
              Java
            </span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span>{formatBytes(calculatedSize)}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
              title="Copy plain source code"
              aria-label="Copy source code"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
              title={`Download ${fileName}`}
              aria-label="Download Java file"
            >
              <Download className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse editor height' : 'Expand editor height'}
              aria-label={isExpanded ? 'Collapse editor' : 'Expand editor'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Editor Canvas (Line Numbers + Syntax-Highlighted Code) ──────────── */}
      <div
        className={`overflow-auto font-mono text-xs text-slate-900 dark:text-[#E6EDF3] selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-100 ${
          isExpanded ? 'max-h-[85vh]' : 'max-h-[520px]'
        }`}
      >
        <div className="flex min-w-full">
          {/* Line Numbers Column */}
          <div
            className="sticky left-0 select-none py-3 px-3 text-right text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-[#080C10] border-r border-slate-200 dark:border-slate-800/80 flex flex-col font-mono text-[11px] leading-5 min-w-[3.25rem] shrink-0 z-10"
            aria-hidden="true"
          >
            {lines.map((_, i) => (
              <span key={i} className="hover:text-slate-700 dark:hover:text-slate-400 transition-colors">
                {i + 1}
              </span>
            ))}
          </div>

          {/* Code Content Column */}
          <pre className="flex-1 py-3 px-4 font-mono text-xs leading-5 overflow-x-auto whitespace-pre tab-4 m-0 bg-white dark:bg-[#0B0F14]">
            <code
              className="language-java text-slate-900 dark:text-[#E6EDF3]"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
};
