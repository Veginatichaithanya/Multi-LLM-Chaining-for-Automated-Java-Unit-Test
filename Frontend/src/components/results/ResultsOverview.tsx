/**
 * ResultsOverview.tsx
 *
 * Top panel for the Results & Discussion page.
 * Provides:
 *   - Project selector (dropdown)
 *   - Experiment selector (dropdown)
 *   - Run selector (dropdown)
 *   - Auto-generated factual Discussion Summary based strictly on real measured values
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, FlaskConical, BarChart3 } from 'lucide-react';
import { projectApi } from '../../services/projectApi';
import type { Project } from '../../services/projectApi';
import { experimentApi } from '../../services/experimentApi';
import type { ExperimentOut, ExperimentDetailOut, ExperimentRunOut } from '../../services/experimentApi';
import { resultsApi } from '../../services/resultsApi';
import type { ComparisonResponse, RefinementHistoryResponse } from '../../services/resultsApi';

interface Props {
  selectedProjectId: string;
  selectedExperimentId: string;
  selectedRunId: string;
  onProjectChange: (id: string) => void;
  onExperimentChange: (id: string) => void;
  onRunChange: (id: string) => void;
  comparisonData: ComparisonResponse | null;
  historyData: RefinementHistoryResponse | null;
  onGenerateGraphs?: (projectId: string, experimentId: string, runId: string) => void;
  isGeneratingGraphs?: boolean;
}

function buildDiscussionSummary(
  comp: ComparisonResponse | null,
  hist: RefinementHistoryResponse | null,
): string | null {
  if (!comp?.has_data || comp.status === 'insufficient_data') return null;

  const s = comp.single_llm;
  const m = comp.multi_llm;

  const pct = (v: number | null | undefined) => (v == null ? 'not measured' : `${v.toFixed(1)}%`);
  const iterCount = (hist?.iterations?.length ?? 1) - 1;

  let summary =
    `The multi-LLM configuration achieved ${pct(m.line_coverage)} line coverage ` +
    `compared with ${pct(s.line_coverage)} for the single-LLM configuration. ` +
    `Branch coverage changed from ${pct(s.branch_coverage)} to ${pct(m.branch_coverage)}. `;

  if (s.mutation_score != null || m.mutation_score != null) {
    summary +=
      `The mutation score changed from ${pct(s.mutation_score)} ` +
      `to ${pct(m.mutation_score)}. `;
  }

  if (iterCount > 0) {
    summary += `These results were obtained after ${iterCount} refinement iteration${iterCount !== 1 ? 's' : ''}.`;
  }

  return summary;
}

export const ResultsOverview: React.FC<Props> = ({
  selectedProjectId,
  selectedExperimentId,
  selectedRunId,
  onProjectChange,
  onExperimentChange,
  onRunChange,
  comparisonData,
  historyData,
  onGenerateGraphs,
  isGeneratingGraphs,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [experiments, setExperiments] = useState<ExperimentOut[]>([]);
  const [runs, setRuns] = useState<ExperimentRunOut[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingExperiments, setLoadingExperiments] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [isAutoGeneratingExp, setIsAutoGeneratingExp] = useState(false);

  // Stable refs so callbacks never need to be in dep arrays
  const onProjectChangeRef = useRef(onProjectChange);
  const onExperimentChangeRef = useRef(onExperimentChange);
  const onRunChangeRef = useRef(onRunChange);
  useEffect(() => { onProjectChangeRef.current = onProjectChange; });
  useEffect(() => { onExperimentChangeRef.current = onExperimentChange; });
  useEffect(() => { onRunChangeRef.current = onRunChange; });

  // Load projects once
  useEffect(() => {
    setLoadingProjects(true);
    projectApi
      .list()
      .then((r) => {
        setProjects(r.projects);
        if (r.projects.length > 0 && !selectedProjectId) {
          onProjectChangeRef.current(r.projects[0].id);
        }
      })
      .catch(console.warn)
      .finally(() => setLoadingProjects(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload experiments ONLY when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) {
      setExperiments([]);
      setRuns([]);
      return;
    }
    setLoadingExperiments(true);
    experimentApi
      .list(selectedProjectId)
      .then((exps) => {
        setExperiments(exps);
        if (exps.length > 0) {
          // Keep current selection if valid in new project, otherwise pick first
          if (!exps.some((e) => e.id === selectedExperimentId)) {
            onExperimentChangeRef.current(exps[0].id);
          }
        } else {
          onExperimentChangeRef.current('');
          setRuns([]);
          onRunChangeRef.current('');
        }
      })
      .catch(console.warn)
      .finally(() => setLoadingExperiments(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // Reload runs ONLY when selectedExperimentId changes
  useEffect(() => {
    if (!selectedExperimentId) {
      setRuns([]);
      return;
    }
    setLoadingRuns(true);
    experimentApi
      .get(selectedExperimentId)
      .then((detail: ExperimentDetailOut) => {
        const multiRuns = (detail.runs || []).filter((r) => r.iteration > 0);
        setRuns(multiRuns);
        if (multiRuns.length > 0) {
          // Keep current selection if valid, otherwise select latest refinement run
          if (!multiRuns.some((r) => r.id === selectedRunId)) {
            onRunChangeRef.current(multiRuns[multiRuns.length - 1].id);
          }
        } else {
          onRunChangeRef.current('');
        }
      })
      .catch(console.warn)
      .finally(() => setLoadingRuns(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExperimentId]);

  const handleGenerateClick = async () => {
    if (!selectedProjectId) return;

    if (experiments.length === 0) {
      setIsAutoGeneratingExp(true);
      try {
        await resultsApi.seedBenchmark(selectedProjectId);
        const updatedExps = await experimentApi.list(selectedProjectId);
        setExperiments(updatedExps);
        if (updatedExps.length > 0) {
          const newExpId = updatedExps[0].id;
          onExperimentChange(newExpId);
          const detail = await experimentApi.get(newExpId);
          const multiRuns = (detail.runs || []).filter((r) => r.iteration > 0);
          setRuns(multiRuns);
          const newRunId = multiRuns.length > 0 ? multiRuns[multiRuns.length - 1].id : '';
          if (newRunId) onRunChange(newRunId);
          onGenerateGraphs?.(selectedProjectId, newExpId, newRunId);
        }
      } catch (err) {
        console.warn('Failed to seed benchmark experiment:', err);
      } finally {
        setIsAutoGeneratingExp(false);
      }
      return;
    }

    onGenerateGraphs?.(selectedProjectId, selectedExperimentId, selectedRunId);
  };

  const discussion = buildDiscussionSummary(comparisonData, historyData);

  const selectClass =
    'rounded-xl bg-white dark:bg-[#0a0f1a] border border-slate-200 dark:border-slate-700/60 ' +
    'text-slate-800 dark:text-slate-200 text-xs px-3 py-2 min-w-[200px] ' +
    'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-colors cursor-pointer';

  return (
    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <FlaskConical className="w-4 h-4 text-cyan-500 shrink-0" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Experiment Selection</h2>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto hidden sm:block">
          Select Project, Experiment, and Run to display factual research data
        </span>
      </div>

      {/* Selectors: Project, Experiment, Run + Action Button */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Project Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Project
          </label>
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading…
            </div>
          ) : (
            <select
              id="results-project-select"
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className={selectClass}
            >
              <option value="">— Select project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Experiment Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Experiment
          </label>
          {loadingExperiments ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading…
            </div>
          ) : (
            <select
              id="results-experiment-select"
              value={selectedExperimentId}
              onChange={(e) => onExperimentChange(e.target.value)}
              disabled={!selectedProjectId}
              className={selectClass}
            >
              <option value="">
                {experiments.length === 0 ? '— No experiments found —' : '— Select experiment —'}
              </option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name} ({exp.configuration} · {exp.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Run Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Run (Multi-LLM)
          </label>
          {loadingRuns ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading…
            </div>
          ) : (
            <select
              id="results-run-select"
              value={selectedRunId}
              onChange={(e) => onRunChange(e.target.value)}
              disabled={!selectedExperimentId || runs.length === 0}
              className={selectClass}
            >
              <option value="">
                {runs.length === 0
                  ? '— Single-LLM Baseline (No Refinement) —'
                  : '— Select refinement run —'}
              </option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  Iteration {r.iteration} ({r.provider}/{r.model}) · {r.status}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Button: Generate Graphs */}
        <div className="flex flex-col gap-1.5 justify-end">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Action
          </label>
          <button
            id="generate-graphs-btn"
            type="button"
            onClick={handleGenerateClick}
            disabled={!selectedProjectId || isGeneratingGraphs || isAutoGeneratingExp}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed h-[37px] whitespace-nowrap"
          >
            {isGeneratingGraphs || isAutoGeneratingExp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>{isAutoGeneratingExp ? 'Setting up Benchmark…' : 'Generating Graphs…'}</span>
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 text-slate-950" />
                <span>Generate Graphs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Identifiers display */}
      {selectedExperimentId && (
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800/50 pt-3 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="text-slate-400 dark:text-slate-500">Experiment ID: </span>
            <span className="text-slate-600 dark:text-slate-400 break-all">{selectedExperimentId}</span>
          </span>
          {selectedRunId && (
            <span>
              <span className="text-slate-400 dark:text-slate-500">Run ID: </span>
              <span className="text-slate-600 dark:text-slate-400 break-all">{selectedRunId}</span>
            </span>
          )}
        </div>
      )}

      {/* Discussion Summary */}
      {discussion && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/40 p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Discussion Summary
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{discussion}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 italic">
            Values derived exclusively from measured experimental data. No inferences made.
          </p>
        </div>
      )}
    </div>
  );
};
