/**
 * RefinementHistoryChart.tsx — Fig. 4
 *
 * Line chart showing test-suite effectiveness across successive refinement iterations.
 * Three lines: Line Coverage, Branch Coverage, Mutation Score.
 *
 * Only iterations that actually exist in the database are plotted.
 * If fewer than 3 iterations occurred, the chart correctly reflects that.
 * Never creates artificial data points.
 */

import React, { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { Eye } from 'lucide-react';
import type { RefinementHistoryResponse } from '../../services/resultsApi';
import { ResearchFigureModal } from './ResearchFigureModal';
import { FigureExportButton } from './FigureExportButton';

const LINE_COLORS = {
  line_coverage: '#22d3ee',    // cyan-400
  branch_coverage: '#818cf8', // indigo-400
  mutation_score: '#34d399',  // emerald-400
};

const LINE_COLORS_PAPER = {
  line_coverage: '#0ea5e9',
  branch_coverage: '#6366f1',
  mutation_score: '#059669',
};

const FIGURE_CAPTION =
  'Improvement in test-suite effectiveness across successive LLM-based refinement iterations.';

interface Props {
  data: RefinementHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.stroke }} className="font-mono">
          {p.name}: {p.value != null ? `${Number(p.value).toFixed(1)}%` : 'N/A'}
        </p>
      ))}
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  if (payload[dataKey] == null) return null;
  return <Dot cx={cx} cy={cy} r={4} fill={props.stroke} stroke="#fff" strokeWidth={1.5} />;
};

export const RefinementHistoryChartInner: React.FC<{
  data: RefinementHistoryResponse;
  paperMode?: boolean;
}> = ({ data, paperMode = false }) => {
  const axisColor = paperMode ? '#333' : '#94a3b8';
  const gridColor = paperMode ? '#e2e8f0' : '#1e293b';
  const colors = paperMode ? LINE_COLORS_PAPER : LINE_COLORS;
  const bgColor = paperMode ? '#fff' : 'transparent';

  const chartData = data.iterations.map((it) => ({
    name: it.label,
    'Line Coverage': it.line_coverage,
    'Branch Coverage': it.branch_coverage,
    'Mutation Score': it.mutation_score,
  }));

  return (
    <div style={{ background: bgColor }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 24, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
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
            label={{
              value: 'Percentage (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              style: { fill: axisColor, fontSize: 11 },
            }}
          />
          {!paperMode && <Tooltip content={<CustomTooltip />} />}
          <Legend wrapperStyle={{ fontSize: 11, color: axisColor, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="Line Coverage"
            stroke={colors.line_coverage}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="Branch Coverage"
            stroke={colors.branch_coverage}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="Mutation Score"
            stroke={colors.mutation_score}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RefinementHistoryChart: React.FC<Props> = ({ data, loading, error }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <section className="rounded-2xl bg-[#090d16] border border-slate-800/70 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider mb-1">Fig. 4</p>
          <h3 className="text-sm font-semibold text-slate-100">
            Test-Suite Improvement Across Refinement Iterations
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data?.has_data && (
            <>
              <FigureExportButton targetRef={captureRef} filename="fig4_refinement_history.png" />
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-indigo-950/60 text-indigo-300 border border-indigo-800/50
                           hover:bg-indigo-900/60 transition-all cursor-pointer"
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
            Loading refinement history…
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
              <span className="text-xl">📈</span>
            </div>
            <p className="text-slate-400 text-sm text-center max-w-xs leading-relaxed">
              No refinement iterations found.<br />
              Run a multi-LLM refinement to populate this chart.
            </p>
          </div>
        )}
        {!loading && !error && data?.has_data && (
          <RefinementHistoryChartInner data={data} />
        )}
      </div>

      {data?.has_data && (
        <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-800/50 pt-3">
          {data.iterations.length} iteration{data.iterations.length !== 1 ? 's' : ''} recorded.
          Only iterations that were actually executed appear on the chart.
        </p>
      )}

      <ResearchFigureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        figureNumber="Fig. 4"
        title="Test-Suite Improvement Across Refinement Iterations"
        caption={FIGURE_CAPTION}
        filename="fig4_refinement_history.png"
      >
        {data?.has_data && <RefinementHistoryChartInner data={data} paperMode />}
      </ResearchFigureModal>
    </section>
  );
};
