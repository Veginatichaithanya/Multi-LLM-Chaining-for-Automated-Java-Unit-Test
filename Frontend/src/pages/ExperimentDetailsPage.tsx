/**
 * ExperimentDetailsPage.tsx — Phase 6 Experiment Execution & Details View.
 *
 * Shows:
 * - Experiment metadata & status
 * - Run Experiment button with live stage progress
 * - Iteration history table (per ExperimentRun)
 * - Metrics breakdown per run
 * - Factual comparison note (no winner labeling)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FlaskConical,
  ArrowLeft,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Cpu,
  GitMerge,
  Zap,
  Info,
} from 'lucide-react';
import { experimentApi } from '../services/experimentApi';
import type {
  ExperimentDetailOut,
  ExperimentRunOut,
  ExperimentMetricOut,
} from '../services/experimentApi';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtMs(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CONFIG_LABELS: Record<string, string> = {
  gemini_only: 'Gemini Only',
  openrouter_only: 'GPT-4o Only',
  gemini_to_openrouter: 'Gemini → GPT-4o',
  gemini_to_gpt4o: 'Gemini → GPT-4o',
  gemini: 'Gemini Only',
  openrouter: 'GPT-4o Only',
  agentrouter_only: 'AgentRouter Only',
  agentrouter: 'AgentRouter Only',
  gemini_to_agentrouter: 'Gemini → AgentRouter',
};

const CONFIG_COLOR: Record<string, string> = {
  gemini_only: 'text-blue-300 border-blue-800/60 bg-blue-950/30',
  openrouter_only: 'text-violet-300 border-violet-800/60 bg-violet-950/30',
  gemini_to_openrouter: 'text-cyan-300 border-cyan-800/60 bg-cyan-950/30',
  gemini_to_gpt4o: 'text-cyan-300 border-cyan-800/60 bg-cyan-950/30',
  gemini: 'text-blue-300 border-blue-800/60 bg-blue-950/30',
  openrouter: 'text-violet-300 border-violet-800/60 bg-violet-950/30',
  agentrouter_only: 'text-amber-300 border-amber-800/60 bg-amber-950/30',
  agentrouter: 'text-amber-300 border-amber-800/60 bg-amber-950/30',
  gemini_to_agentrouter: 'text-teal-300 border-teal-800/60 bg-teal-950/30',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-slate-400',
  running: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-rose-400',
  cancelled: 'text-slate-400',
};

// ── Pipeline stage definitions ─────────────────────────────────────────────

interface Stage {
  id: string;
  label: string;
}

const STAGES_GEMINI_ONLY: Stage[] = [
  { id: 'source', label: 'Source Loading' },
  { id: 'generate', label: 'AI Generation' },
  { id: 'compile', label: 'Maven Compile' },
  { id: 'junit', label: 'JUnit Execution' },
  { id: 'jacoco', label: 'JaCoCo Coverage' },
  { id: 'done', label: 'Completed' },
];

const STAGES_OPENROUTER_ONLY: Stage[] = STAGES_GEMINI_ONLY;

const STAGES_CHAINED: Stage[] = [
  { id: 'source', label: 'Source Loading' },
  { id: 'generate', label: 'Gemini Generation' },
  { id: 'compile', label: 'Maven Compile' },
  { id: 'junit', label: 'JUnit Execution' },
  { id: 'jacoco', label: 'JaCoCo Coverage' },
  { id: 'feedback', label: 'Feedback Synthesis' },
  { id: 'refine', label: 'GPT-4o Refinement' },
  { id: 're-exec', label: 'Re-Execution' },
  { id: 'done', label: 'Completed' },
];

// ── Pipeline progress bar ────────────────────────────────────────────────────

function PipelineProgress({
  stages,
  currentStageIndex,
  failed,
}: {
  stages: Stage[];
  currentStageIndex: number;
  failed: boolean;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, i) => {
        const done = i < currentStageIndex;
        const active = i === currentStageIndex;
        const isFailed = failed && active;
        return (
          <React.Fragment key={stage.id}>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
                isFailed
                  ? 'bg-rose-950/40 text-rose-400 border border-rose-800/60'
                  : done
                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
                  : active
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60 animate-pulse'
                  : 'bg-[#070b12] text-slate-600 border border-slate-800/40'
              }`}
            >
              {isFailed ? (
                <XCircle className="w-2.5 h-2.5" />
              ) : done ? (
                <CheckCircle2 className="w-2.5 h-2.5" />
              ) : active ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Clock className="w-2.5 h-2.5" />
              )}
              {stage.label}
            </div>
            {i < stages.length - 1 && (
              <ChevronRight className="w-2.5 h-2.5 text-slate-700 shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Metric chip ──────────────────────────────────────────────────────────────

function MetricChip({ label, value, color = 'text-slate-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#070b12] rounded-lg p-2.5 text-center">
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

// ── Run Row (expandable) ─────────────────────────────────────────────────────

function RunRow({ run, index }: { run: ExperimentRunOut; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const metric: ExperimentMetricOut | undefined = run.metrics?.[0];

  const runStatusColor = STATUS_COLOR[run.status] ?? 'text-slate-400';

  return (
    <div className="border border-slate-800/60 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 bg-[#090d16] hover:bg-[#0b1020] transition-colors text-left"
      >
        <span className="text-[10px] font-mono text-slate-500 w-16 shrink-0">
          Iter {run.iteration}
        </span>
        <span className={`text-xs font-mono shrink-0 ${runStatusColor}`}>
          {run.status}
        </span>
        <span className="text-[10px] text-slate-500 font-mono shrink-0">
          {run.provider}/{run.model.split('/').pop()}
        </span>
        {metric && (
          <div className="flex items-center gap-3 ml-auto text-[10px] font-mono">
            <span className="text-cyan-300">{fmtPct(metric.line_coverage)} line</span>
            <span className="text-violet-300">{fmtPct(metric.branch_coverage)} branch</span>
            <span className="text-slate-400">
              {metric.passed_tests}/{metric.total_tests} tests
            </span>
          </div>
        )}
        <span className="text-[10px] text-slate-500 shrink-0 ml-2">{fmtMs(run.execution_time_ms)}</span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        )}
      </button>

      {/* Expanded metrics */}
      {expanded && metric && (
        <div className="px-4 pb-4 bg-[#070a10] border-t border-slate-800/60">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
            <MetricChip
              label="Line Cov"
              value={fmtPct(metric.line_coverage)}
              color="text-cyan-300"
            />
            <MetricChip
              label="Branch Cov"
              value={fmtPct(metric.branch_coverage)}
              color="text-violet-300"
            />
            <MetricChip
              label="Instr Cov"
              value={fmtPct(metric.instruction_coverage)}
              color="text-indigo-300"
            />
            <MetricChip
              label="Method Cov"
              value={fmtPct(metric.method_coverage)}
              color="text-emerald-300"
            />
            <MetricChip
              label="Tests Passed"
              value={`${metric.passed_tests}/${metric.total_tests}`}
              color={metric.failed_tests > 0 ? 'text-amber-300' : 'text-emerald-300'}
            />
            <MetricChip
              label="Duration"
              value={fmtMs(metric.total_execution_time_ms)}
              color="text-slate-300"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500">Generated Tests: </span>
              <span className="text-slate-300 font-mono">{metric.generated_test_count}</span>
            </div>
            <div>
              <span className="text-slate-500">Compilation: </span>
              <span className={metric.compilation_success ? 'text-emerald-400' : 'text-rose-400'}>
                {metric.compilation_success ? 'Success' : 'Failed'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Execution: </span>
              <span className={metric.execution_success ? 'text-emerald-400' : 'text-rose-400'}>
                {metric.execution_success ? 'Success' : 'Failed'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Refinements: </span>
              <span className="text-slate-300 font-mono">{metric.refinement_iterations}</span>
            </div>
          </div>
        </div>
      )}
      {expanded && !metric && (
        <div className="px-4 py-3 bg-[#070a10] border-t border-slate-800/60 text-xs text-slate-500">
          No metrics recorded for this iteration.
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ExperimentDetailsPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [experiment, setExperiment] = useState<ExperimentDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Stage animation state
  const [stageIndex, setStageIndex] = useState(0);
  const [stageFailed, setStageFailed] = useState(false);
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!experimentId) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await experimentApi.get(experimentId);
      setExperiment(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load experiment');
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  useEffect(() => { load(); }, [load]);

  // Poll while running
  useEffect(() => {
    if (!experiment) return;
    if (experiment.status === 'running') {
      const interval = setInterval(() => load(true), 5000);
      return () => clearInterval(interval);
    }
  }, [experiment, load]);

  const getStages = (cfg: string): Stage[] => {
    if (cfg === 'gemini_only' || cfg === 'gemini') return STAGES_GEMINI_ONLY;
    if (cfg === 'openrouter_only' || cfg === 'openrouter') return STAGES_OPENROUTER_ONLY;
    return STAGES_CHAINED;
  };

  const handleRun = async () => {
    if (!experiment) return;
    setRunning(true);
    setRunError(null);
    setStageFailed(false);
    setStageIndex(0);

    const stages = getStages(experiment.configuration);

    // Advance stage animation while backend runs
    stageIntervalRef.current = setInterval(() => {
      setStageIndex(prev => {
        if (prev < stages.length - 2) return prev + 1;
        return prev;
      });
    }, 4500);

    try {
      await experimentApi.run(experiment.id);
      // Stop animation at final stage
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      setStageIndex(stages.length - 1);
      // Reload to get real results
      await load(true);
    } catch (e: unknown) {
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      setStageFailed(true);
      setRunError(e instanceof Error ? e.message : 'Experiment execution failed');
      await load(true);
    } finally {
      setRunning(false);
    }
  };

  // ── Derived UI state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-slate-400">Loading experiment…</span>
        </div>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
          <p className="text-sm text-rose-300">{error ?? 'Experiment not found'}</p>
          <button
            type="button"
            onClick={() => navigate('/experiments')}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            Back to Experiments
          </button>
        </div>
      </div>
    );
  }

  const cfg = experiment.configuration;
  const cfgLabel = CONFIG_LABELS[cfg] ?? cfg;
  const cfgColor = CONFIG_COLOR[cfg] ?? 'text-slate-300 border-slate-700 bg-slate-800/30';
  const stages = getStages(cfg);

  const CfgIcon =
    cfg.includes('chain') || cfg === 'gemini_to_openrouter' || cfg === 'gemini_to_gpt4o'
      ? GitMerge
      : cfg.includes('openrouter') || cfg === 'openrouter'
      ? Zap
      : Cpu;

  const latestMetric = experiment.metrics?.[experiment.metrics.length - 1];
  const isRunnable = experiment.status === 'pending' || experiment.status === 'failed' || experiment.status === 'cancelled';
  const isRunning = experiment.status === 'running' || running;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-radial-gradient opacity-40 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-dev-grid opacity-15 pointer-events-none z-0" />

      {/* Top Application Header */}
      <AppHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenPlaceholder={() => {}}
      />

      {/* Mobile Drawer */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenPlaceholder={() => {}}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex relative z-10">
        {/* Desktop Sidebar */}
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onOpenPlaceholder={() => {}}
        />

        {/* Main Content Area */}
        <main
          id="main-content"
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto"
        >
          {/* Header */}
          <div className="border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/experiments')}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Back to Experiments"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/70 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{experiment.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cfgColor}`}>
                      {cfgLabel}
                    </span>
                    <span className={`text-[10px] font-mono ${STATUS_COLOR[experiment.status] ?? 'text-slate-400'}`}>
                      {experiment.status}
                    </span>
                  </div>
                </div>
              </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => load(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {(isRunnable || isRunning) && (
              <button
                type="button"
                id="run-experiment-btn"
                onClick={handleRun}
                disabled={running || isRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-700/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running || isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Run Experiment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Run in-progress stage bar */}
        {(running || isRunning) && (
          <div className="bg-[#090d16] border border-amber-800/40 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-sm font-medium text-amber-300">Experiment Executing…</span>
              <span className="text-xs text-slate-500">Maven + JUnit + JaCoCo running in sandbox</span>
            </div>
            <PipelineProgress stages={stages} currentStageIndex={stageIndex} failed={stageFailed} />
          </div>
        )}

        {/* Run error */}
        {runError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 text-sm text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Execution Failed</p>
              <p className="text-xs text-rose-400 mt-0.5">{runError}</p>
            </div>
          </div>
        )}

        {/* Completed pipeline visualization */}
        {experiment.status === 'completed' && (
          <div className="bg-[#090d16] border border-emerald-800/40 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Execution Completed</span>
              {experiment.completed_at && (
                <span className="text-xs text-slate-500 ml-auto">{fmtDate(experiment.completed_at)}</span>
              )}
            </div>
            <PipelineProgress stages={stages} currentStageIndex={stages.length} failed={false} />
          </div>
        )}

        {/* Experiment info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#090d16] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">Configuration</span>
            <div className="flex items-center gap-2">
              <CfgIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">{cfgLabel}</span>
            </div>
          </div>
          <div className="bg-[#090d16] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">Initial LLM</span>
            <span className="text-sm font-mono text-slate-200">{experiment.initial_model}</span>
          </div>
          {experiment.refinement_model && (
            <div className="bg-[#090d16] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">Refinement LLM</span>
              <span className="text-sm font-mono text-slate-200">{experiment.refinement_model}</span>
            </div>
          )}
          <div className="bg-[#090d16] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">Max Iterations</span>
            <span className="text-2xl font-bold font-mono text-cyan-300">{experiment.max_iterations}</span>
          </div>
          <div className="bg-[#090d16] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">Total Duration</span>
            <span className="text-2xl font-bold font-mono text-amber-300">{fmtMs(experiment.execution_time_ms)}</span>
          </div>
        </div>

        {/* Final metrics summary (if completed) */}
        {experiment.status === 'completed' && latestMetric && (
          <section>
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Final Metrics
            </h2>
            <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-5">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <MetricChip label="Line Coverage" value={fmtPct(experiment.line_coverage)} color="text-cyan-300" />
                <MetricChip label="Branch Coverage" value={fmtPct(experiment.branch_coverage)} color="text-violet-300" />
                <MetricChip label="Instr Coverage" value={fmtPct(latestMetric.instruction_coverage)} color="text-indigo-300" />
                <MetricChip label="Method Coverage" value={fmtPct(latestMetric.method_coverage)} color="text-emerald-300" />
                <MetricChip
                  label="Tests Passed"
                  value={`${latestMetric.passed_tests}/${latestMetric.total_tests}`}
                  color={latestMetric.failed_tests > 0 ? 'text-amber-300' : 'text-emerald-300'}
                />
                <MetricChip label="Refinements" value={String(latestMetric.refinement_iterations)} color="text-slate-300" />
              </div>

              {/* Factual note */}
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-start gap-2 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                All metrics are captured from actual Maven, JUnit, and JaCoCo execution.
                No values are fabricated or estimated. AI assists test generation;
                all measurements are from real sandbox execution.
              </div>
            </div>
          </section>
        )}

        {/* Iteration history */}
        {experiment.runs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              Iteration History
              <span className="text-[10px] font-mono text-slate-500">
                ({experiment.runs.length} iteration{experiment.runs.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <div className="space-y-2">
              {experiment.runs.map((run, i) => (
                <RunRow key={run.id} run={run} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Error details */}
        {experiment.error_message && (
          <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-rose-300 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Error Details
            </h3>
            <pre className="text-xs text-rose-400 font-mono whitespace-pre-wrap break-words">
              {experiment.error_message}
            </pre>
          </div>
        )}

        {/* Pending state — run prompt */}
        {experiment.status === 'pending' && !running && (
          <div className="flex flex-col items-center justify-center py-12 gap-5 text-center">
            <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800/80">
              <FlaskConical className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">Experiment Ready</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click <span className="text-emerald-300 font-medium">Run Experiment</span> to start
                the {cfgLabel} pipeline. Maven, JUnit, and JaCoCo will execute in the sandbox
                and report real measurements.
              </p>
            </div>
            <button
              type="button"
              id="run-experiment-center-btn"
              onClick={handleRun}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-700/60 transition-all"
            >
              <Play className="w-4 h-4" />
              Run Experiment
            </button>
          </div>
        )}

        {/* Description */}
        {experiment.description && (
          <div className="bg-[#090d16] border border-slate-800/60 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider block mb-1">Description</span>
            {experiment.description}
          </div>
        )}

        {/* Metadata footer */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-wrap gap-4 text-[10px] text-slate-500 font-mono">
          <span>ID: {experiment.id}</span>
          <span>Created: {fmtDate(experiment.created_at)}</span>
          {experiment.started_at && <span>Started: {fmtDate(experiment.started_at)}</span>}
          {experiment.completed_at && <span>Completed: {fmtDate(experiment.completed_at)}</span>}
          <span>Framework: {experiment.framework}</span>
          <span>Build: {experiment.build_tool}</span>
        </div>
        </div>
        </main>
      </div>
    </div>
  );
}

export default ExperimentDetailsPage;
