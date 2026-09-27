/**
 * SingleVsMultiChart.tsx — Fig. 3
 *
 * Publication-quality grouped bar chart:
 * "Comparison of Single-LLM and Multi-LLM Test Generation"
 *
 * Metrics:
 *   - Line Coverage (%)
 *   - Branch Coverage (%)
 *   - Mutation Score (%)
 *
 * Displays ONLY real backend data.
 * If data is incomplete: shows clear message:
 *   "No completed experimental data available."
 *   "Run a Single-LLM and Multi-LLM experiment to generate Fig. 3."
 *
 * Table underneath calculates strictly neutral difference:
 *   "Difference: +X.X percentage points"
 *
 * "Research Figure" mode opens an academic white-background, serif-typography
 * IEEE-style figure view with high-res PNG export.
 */

import React, { useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { Eye, Table as TableIcon } from 'lucide-react';
import type { ComparisonResponse } from '../../services/resultsApi';
import { ResearchFigureModal } from './ResearchFigureModal';
import { FigureExportButton } from './FigureExportButton';

const SINGLE_COLOR = '#0284c7'; // Professional cyan-600 / IEEE blue
const MULTI_COLOR = '#4f46e5';  // Indigo-600

const FIGURE_TITLE = 'Comparison of Single-LLM and Multi-LLM Test Generation';
const FIGURE_CAPTION =
  'Fig. 3. Comparison of Single-LLM and Multi-LLM Test Generation based on line coverage, branch coverage, and mutation score.';

interface Props {
  data: ComparisonResponse | null;
  loading: boolean;
  error: string | null;
  paperMode?: boolean;
}

function fmt(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return `${Number(v).toFixed(1)}%`;
}

function formatDifference(diff: number | null): string {
  if (diff == null) return 'N/A';
  const sign = diff > 0 ? '+' : '';
  return `Difference: ${sign}${diff.toFixed(1)} percentage points`;
}

function buildChartData(data: ComparisonResponse) {
  return [
    {
      metric: 'Line Coverage',
      'Single-LLM': data.single_llm?.line_coverage ?? null,
      'Multi-LLM': data.multi_llm?.line_coverage ?? null,
    },
    {
      metric: 'Branch Coverage',
      'Single-LLM': data.single_llm?.branch_coverage ?? null,
      'Multi-LLM': data.multi_llm?.branch_coverage ?? null,
    },
    {
      metric: 'Mutation Score',
      'Single-LLM': data.single_llm?.mutation_score ?? null,
      'Multi-LLM': data.multi_llm?.mutation_score ?? null,
    },
  ];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl font-sans">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill }} className="font-mono">
          {p.name}: {p.value != null ? `${Number(p.value).toFixed(1)}%` : 'N/A'}
        </p>
      ))}
    </div>
  );
};

export const SingleVsMultiChartInner: React.FC<{ data: ComparisonResponse; paperMode?: boolean }> = ({
  data,
  paperMode = false,
}) => {
  const chartData = buildChartData(data);
  const axisColor = paperMode ? '#111827' : '#94a3b8';
  const gridColor = paperMode ? '#e5e7eb' : '#1e293b';
  const bgColor = paperMode ? '#ffffff' : 'transparent';
  const fontStyle = paperMode ? { fontFamily: "'Times New Roman', Times, serif" } : undefined;

  return (
    <div style={{ background: bgColor, ...fontStyle }} className="w-full">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={chartData}
          margin={{ top: 36, right: 32, left: 16, bottom: 12 }}
          barCategoryGap="28%"
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{ fill: axisColor, fontSize: paperMode ? 13 : 12, fontWeight: paperMode ? 600 : 500 }}
            axisLine={{ stroke: axisColor, strokeWidth: paperMode ? 1.5 : 1 }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: axisColor, fontSize: paperMode ? 12 : 11 }}
            axisLine={{ stroke: axisColor, strokeWidth: paperMode ? 1.5 : 1 }}
            tickLine={false}
            label={{
              value: 'Percentage (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              style: { fill: axisColor, fontSize: paperMode ? 13 : 11, fontWeight: paperMode ? 600 : 500 },
            }}
          />
          {!paperMode && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />}
          <Legend
            wrapperStyle={{
              fontSize: paperMode ? 13 : 12,
              color: axisColor,
              paddingTop: 12,
              fontWeight: paperMode ? 600 : 500,
            }}
          />
          <Bar dataKey="Single-LLM" fill={SINGLE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={52}>
            <LabelList
              dataKey="Single-LLM"
              position="top"
              formatter={(v: any) => fmt(v)}
              style={{
                fill: paperMode ? '#111827' : '#94a3b8',
                fontSize: paperMode ? 12 : 11,
                fontWeight: 600,
              }}
            />
          </Bar>
          <Bar dataKey="Multi-LLM" fill={MULTI_COLOR} radius={[3, 3, 0, 0]} maxBarSize={52}>
            <LabelList
              dataKey="Multi-LLM"
              position="top"
              formatter={(v: any) => fmt(v)}
              style={{
                fill: paperMode ? '#111827' : '#94a3b8',
                fontSize: paperMode ? 12 : 11,
                fontWeight: 600,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SingleVsMultiChart: React.FC<Props> = ({ data, loading, error }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // Validate that real experimental data exists for all 6 points
  const hasRealData =
    Boolean(data) &&
    data?.status !== 'insufficient_data' &&
    Boolean(data?.has_data) &&
    data?.single_llm?.line_coverage != null &&
    data?.single_llm?.branch_coverage != null &&
    data?.single_llm?.mutation_score != null &&
    data?.multi_llm?.line_coverage != null &&
    data?.multi_llm?.branch_coverage != null &&
    data?.multi_llm?.mutation_score != null;

  // Differences
  const lineDiff =
    hasRealData && data?.multi_llm?.line_coverage != null && data?.single_llm?.line_coverage != null
      ? data.multi_llm.line_coverage - data.single_llm.line_coverage
      : null;
  const branchDiff =
    hasRealData && data?.multi_llm?.branch_coverage != null && data?.single_llm?.branch_coverage != null
      ? data.multi_llm.branch_coverage - data.single_llm.branch_coverage
      : null;
  const mutDiff =
    hasRealData && data?.multi_llm?.mutation_score != null && data?.single_llm?.mutation_score != null
      ? data.multi_llm.mutation_score - data.single_llm.mutation_score
      : null;

  return (
    <section className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-1">
            FIG. 3
          </p>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {FIGURE_TITLE}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasRealData && (
            <>
              <FigureExportButton targetRef={captureRef} filename="fig3_single_vs_multi.png" />
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50
                           hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Research Figure
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chart Body */}
      <div ref={captureRef} className="pt-2">
        {loading && (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Loading experimental data…
          </div>
        )}

        {error && (
          <div className="h-64 flex items-center justify-center text-rose-500 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && !hasRealData && (
          <div className="h-64 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div className="space-y-1">
              <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">
                No completed experimental data available.
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm">
                Run a Single-LLM and Multi-LLM experiment to generate Fig. 3.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && hasRealData && data && (
          <SingleVsMultiChartInner data={data} />
        )}
      </div>

      {/* Numerical Comparison Table */}
      {hasRealData && data && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <TableIcon className="w-3.5 h-3.5 text-cyan-500" />
            <span>Experimental Results Breakdown</span>
          </div>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-4">Metric</th>
                  <th className="py-2.5 px-4">Single-LLM</th>
                  <th className="py-2.5 px-4">Multi-LLM</th>
                  <th className="py-2.5 px-4">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-800 dark:text-slate-200">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">Line Coverage</td>
                  <td className="py-2.5 px-4">{fmt(data.single_llm.line_coverage)}</td>
                  <td className="py-2.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">{fmt(data.multi_llm.line_coverage)}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">{formatDifference(lineDiff)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">Branch Coverage</td>
                  <td className="py-2.5 px-4">{fmt(data.single_llm.branch_coverage)}</td>
                  <td className="py-2.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">{fmt(data.multi_llm.branch_coverage)}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">{formatDifference(branchDiff)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">Mutation Score</td>
                  <td className="py-2.5 px-4">{fmt(data.single_llm.mutation_score)}</td>
                  <td className="py-2.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">{fmt(data.multi_llm.mutation_score)}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">{formatDifference(mutDiff)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explanatory Caption */}
      {hasRealData && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800/50 pt-3">
          {FIGURE_CAPTION}
        </p>
      )}

      {/* Research Figure Mode Modal */}
      <ResearchFigureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        figureNumber="Fig. 3"
        title={FIGURE_TITLE}
        caption={FIGURE_CAPTION}
        filename="fig3_single_vs_multi.png"
      >
        {hasRealData && data && <SingleVsMultiChartInner data={data} paperMode />}
      </ResearchFigureModal>
    </section>
  );
};
