/**
 * MutationResultsChart.tsx — Fig. 5
 *
 * Dual coordinated charts within one figure:
 *   A. Mutation Score (%) — grouped bar chart
 *   B. Surviving Mutants (count) — grouped bar chart
 *
 * Percentage and raw mutant counts are deliberately placed on separate axes
 * to avoid misleading mixed-scale visualizations.
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
import { Eye } from 'lucide-react';
import type { MutationComparisonResponse } from '../../services/resultsApi';
import { ResearchFigureModal } from './ResearchFigureModal';
import { FigureExportButton } from './FigureExportButton';

const SINGLE_COLOR = '#22d3ee';
const MULTI_COLOR  = '#818cf8';

const FIGURE_CAPTION =
  'Comparison of mutation-testing performance between Single-LLM and Multi-LLM approaches.';

interface Props {
  data: MutationComparisonResponse | null;
  loading: boolean;
  error: string | null;
}

function fmt(v: number | null | undefined, suffix = ''): string {
  if (v == null) return 'N/A';
  return `${v.toFixed(suffix === '%' ? 1 : 0)}${suffix}`;
}

function buildScoreData(data: MutationComparisonResponse) {
  return [
    {
      name: 'Mutation Score',
      'Single-LLM': data.single_llm.mutation_score,
      'Multi-LLM': data.multi_llm.mutation_score,
    },
  ];
}

function buildCountData(data: MutationComparisonResponse) {
  return [
    {
      name: 'Killed Mutants',
      'Single-LLM': data.single_llm.killed_mutants,
      'Multi-LLM': data.multi_llm.killed_mutants,
    },
    {
      name: 'Surviving Mutants',
      'Single-LLM': data.single_llm.surviving_mutants,
      'Multi-LLM': data.multi_llm.surviving_mutants,
    },
    {
      name: 'Total Mutants',
      'Single-LLM': data.single_llm.total_mutants,
      'Multi-LLM': data.multi_llm.total_mutants,
    },
  ];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill }} className="font-mono">
          {p.name}: {p.value != null ? p.value : 'N/A'}
        </p>
      ))}
    </div>
  );
};

export const MutationResultsChartInner: React.FC<{
  data: MutationComparisonResponse;
  paperMode?: boolean;
}> = ({ data, paperMode = false }) => {
  const axisColor = paperMode ? '#333' : '#94a3b8';
  const gridColor = paperMode ? '#e2e8f0' : '#1e293b';
  const bgColor = paperMode ? '#fff' : 'transparent';

  const scoreData = buildScoreData(data);
  const countData = buildCountData(data);

  return (
    <div style={{ background: bgColor }}>
      {/* Sub-figure A: Mutation Score */}
      <div>
        <p
          className="text-center text-[11px] mb-2"
          style={{ color: paperMode ? '#555' : '#94a3b8', fontStyle: 'italic' }}
        >
          (A) Mutation Score Comparison
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={scoreData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={false}
            />
            {!paperMode && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />}
            <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
            <Bar dataKey="Single-LLM" fill={SINGLE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={60}>
              <LabelList
                dataKey="Single-LLM"
                position="top"
                formatter={(v: any) => fmt(v, '%')}
                style={{ fill: paperMode ? '#1a1a1a' : '#94a3b8', fontSize: 10 }}
              />
            </Bar>
            <Bar dataKey="Multi-LLM" fill={MULTI_COLOR} radius={[3, 3, 0, 0]} maxBarSize={60}>
              <LabelList
                dataKey="Multi-LLM"
                position="top"
                formatter={(v: any) => fmt(v, '%')}
                style={{ fill: paperMode ? '#1a1a1a' : '#94a3b8', fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Divider */}
      <div
        className="my-4 border-t"
        style={{ borderColor: paperMode ? '#e2e8f0' : '#1e293b' }}
      />

      {/* Sub-figure B: Mutant Counts */}
      <div>
        <p
          className="text-center text-[11px] mb-2"
          style={{ color: paperMode ? '#555' : '#94a3b8', fontStyle: 'italic' }}
        >
          (B) Mutant Count Comparison
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={countData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={false}
              label={{
                value: 'Count',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: { fill: axisColor, fontSize: 11 },
              }}
            />
            {!paperMode && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />}
            <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
            <Bar dataKey="Single-LLM" fill={SINGLE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={48}>
              <LabelList
                dataKey="Single-LLM"
                position="top"
                formatter={(v: any) => fmt(v)}
                style={{ fill: paperMode ? '#1a1a1a' : '#94a3b8', fontSize: 10 }}
              />
            </Bar>
            <Bar dataKey="Multi-LLM" fill={MULTI_COLOR} radius={[3, 3, 0, 0]} maxBarSize={48}>
              <LabelList
                dataKey="Multi-LLM"
                position="top"
                formatter={(v: any) => fmt(v)}
                style={{ fill: paperMode ? '#1a1a1a' : '#94a3b8', fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const MutationResultsChart: React.FC<Props> = ({ data, loading, error }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <section className="rounded-2xl bg-[#090d16] border border-slate-800/70 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">Fig. 5</p>
          <h3 className="text-sm font-semibold text-slate-100">
            Mutation Score and Surviving Mutants
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data?.has_data && (
            <>
              <FigureExportButton targetRef={captureRef} filename="fig5_mutation_results.png" />
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-emerald-950/60 text-emerald-300 border border-emerald-800/50
                           hover:bg-emerald-900/60 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                View Figure
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={captureRef}>
        {loading && (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Loading mutation data…
          </div>
        )}
        {error && (
          <div className="h-64 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (!data || !data.has_data) && (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
              <span className="text-xl">🧬</span>
            </div>
            <p className="text-slate-400 text-sm text-center max-w-xs leading-relaxed">
              No mutation testing data available.<br />
              Run PIT mutation testing on a generated test suite to populate this chart.
            </p>
          </div>
        )}
        {!loading && !error && data?.has_data && (
          <MutationResultsChartInner data={data} />
        )}
      </div>

      <ResearchFigureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        figureNumber="Fig. 5"
        title="Mutation Score and Surviving Mutants"
        caption={FIGURE_CAPTION}
        filename="fig5_mutation_results.png"
      >
        {data?.has_data && <MutationResultsChartInner data={data} paperMode />}
      </ResearchFigureModal>
    </section>
  );
};
