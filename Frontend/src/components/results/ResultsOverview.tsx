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

import React, { useEffect, useState } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import { projectApi } from '../../services/projectApi';
import type { Project } from '../../services/projectApi';
import { experimentApi } from '../../services/experimentApi';
import type { ExperimentOut, ExperimentDetailOut, ExperimentRunOut } from '../../services/experimentApi';
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
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [experiments, setExperiments] = useState<ExperimentOut[]>([]);
  const [runs, setRuns] = useState<ExperimentRunOut[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingExperiments, setLoadingExperiments] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Load projects once
  useEffect(() => {
    setLoadingProjects(true);
    projectApi
      .list()
      .then((r) => {
        setProjects(r.projects);
        if (r.projects.length > 0 && !selectedProjectId) {
          onProjectChange(r.projects[0].id);
        }
      })
      .catch(console.warn)
      .finally(() => setLoadingProjects(false));
  }, []);

  // Reload experiments when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setExperiments([]);
      onExperimentChange('');
      setRuns([]);
      onRunChange('');
      return;
    }
    setLoadingExperiments(true);
    experimentApi
      .list(selectedProjectId)
      .then((exps) => {
        setExperiments(exps);
        if (exps.length > 0) {
          // Select first experiment if none currently selected or current not in list
          if (!selectedExperimentId || !exps.some((e) => e.id === selectedExperimentId)) {
            onExperimentChange(exps[0].id);
          }
        } else {
          onExperimentChange('');
          setRuns([]);
          onRunChange('');
        }
      })
      .catch(console.warn)
      .finally(() => setLoadingExperiments(false));
  }, [selectedProjectId]);

  // Reload runs when experiment changes
  useEffect(() => {
    if (!selectedExperimentId) {
      setRuns([]);
      onRunChange('');
      return;
    }
    setLoadingRuns(true);
    experimentApi
      .get(selectedExperimentId)
      .then((detail: ExperimentDetailOut) => {
        const multiRuns = (detail.runs || []).filter((r) => r.iteration > 0);
        setRuns(multiRuns);
        if (multiRuns.length > 0) {
          if (!selectedRunId || !multiRuns.some((r) => r.id === selectedRunId)) {
            // Default to latest refinement run
            onRunChange(multiRuns[multiRuns.length - 1].id);
          }
        } else {
          onRunChange('');
        }
      })
      .catch(console.warn)
      .finally(() => setLoadingRuns(false));
  }, [selectedExperimentId]);

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

      {/* Selectors: Project, Experiment, Run */}
      <div className="flex flex-wrap gap-4">
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
