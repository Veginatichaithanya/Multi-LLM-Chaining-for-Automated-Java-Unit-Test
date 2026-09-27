/**
 * ResultsPage.tsx
 *
 * "Results & Discussion" page for the TestForge AI research paper.
 * Layout mirrors ExperimentsPage (AppHeader + AppSidebar + MobileSidebar).
 * Displays three IEEE-paper-quality research figures (Fig. 3, 4, 5).
 * All data comes from the real backend via /api/results/* endpoints.
 * Shows clear empty states when no experiment data exists.
 *
 * UI redesigned to match Experiments page: compact header, KPI bar, unified
 * card styling, consistent light/dark support.  No logic changes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import { DashboardModal } from '../components/dashboard/DashboardModal';
import { ResultsOverview } from '../components/results/ResultsOverview';
import { SingleVsMultiChart } from '../components/results/SingleVsMultiChart';
import { RefinementHistoryChart } from '../components/results/RefinementHistoryChart';
import { MutationResultsChart } from '../components/results/MutationResultsChart';
import { resultsApi } from '../services/resultsApi';
import type {
  ComparisonResponse,
  RefinementHistoryResponse,
  MutationComparisonResponse,
} from '../services/resultsApi';
import { BarChart3, TrendingUp, GitBranch, Crosshair } from 'lucide-react';

// ─── tiny stat pill ───────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap">
        {label}
      </span>
      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 ml-1 font-mono">
        {value}
      </span>
    </div>
  );
}

export const ResultsPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    description: '',
  });

  // ── Experiment selection state ────────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedExperimentId, setSelectedExperimentId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');

  // ── Figure data state ────────────────────────────────────────────────────
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const [historyData, setHistoryData] = useState<RefinementHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [mutationData, setMutationData] = useState<MutationComparisonResponse | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ── Fetch all three figures when selection changes ────────────────────────
  const fetchAll = useCallback(
    async (projectId: string, experimentId: string, runId: string) => {
      if (!projectId) {
        setComparisonData(null);
        setHistoryData(null);
        setMutationData(null);
        return;
      }

      const expIdOrNull = experimentId || null;
      const runIdOrNull = runId || null;

      // Fig. 3 — comparison (Single-LLM vs Multi-LLM real metrics)
      setComparisonLoading(true);
      setComparisonError(null);
      resultsApi
        .getComparison(projectId, null, null, expIdOrNull, runIdOrNull)
        .then(setComparisonData)
        .catch((e) => setComparisonError(e.message ?? 'Failed to load comparison data'))
        .finally(() => setComparisonLoading(false));

      // Fig. 4 — refinement history
      setHistoryLoading(true);
      setHistoryError(null);
      resultsApi
        .getRefinementHistory(projectId, null)
        .then(setHistoryData)
        .catch((e) => setHistoryError(e.message ?? 'Failed to load refinement history'))
        .finally(() => setHistoryLoading(false));

      // Fig. 5 — mutation
      setMutationLoading(true);
      setMutationError(null);
      resultsApi
        .getMutationComparison(projectId, null, null)
        .then(setMutationData)
        .catch((e) => setMutationError(e.message ?? 'Failed to load mutation data'))
        .finally(() => setMutationLoading(false));
    },
    [],
  );

  useEffect(() => {
    fetchAll(selectedProjectId, selectedExperimentId, selectedRunId);
  }, [selectedProjectId, selectedExperimentId, selectedRunId, fetchAll]);

  const handleProjectChange = (id: string) => {
    setSelectedProjectId(id);
    setSelectedExperimentId('');
    setSelectedRunId('');
    setComparisonData(null);
    setHistoryData(null);
    setMutationData(null);
  };

  const handleExperimentChange = (id: string) => {
    setSelectedExperimentId(id);
    setSelectedRunId('');
  };

  const handleRunChange = (id: string) => {
    setSelectedRunId(id);
  };

  const openPlaceholder = (title: string, description: string) => {
    setModalState({ isOpen: true, title, description });
  };

  // ── Derived quick-stats from live data ───────────────────────────────────
  const lineCov =
    comparisonData?.has_data && comparisonData.multi_llm.line_coverage != null
      ? `${comparisonData.multi_llm.line_coverage.toFixed(1)}%`
      : '—';
  const branchCov =
    comparisonData?.has_data && comparisonData.multi_llm.branch_coverage != null
      ? `${comparisonData.multi_llm.branch_coverage.toFixed(1)}%`
      : '—';
  const mutScore =
    comparisonData?.has_data && comparisonData.multi_llm.mutation_score != null
      ? `${comparisonData.multi_llm.mutation_score.toFixed(1)}%`
      : '—';
  const iterations = historyData?.iterations?.length
    ? String(historyData.iterations.length - 1)
    : '—';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-800 dark:text-slate-100 flex flex-col relative font-sans">
      {/* Subtle background grid */}
      <div className="fixed inset-0 bg-dev-grid opacity-10 dark:opacity-15 pointer-events-none z-0" />

      {/* Top header */}
      <AppHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenPlaceholder={openPlaceholder}
      />

      {/* Mobile drawer */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenPlaceholder={openPlaceholder}
      />

      {/* Main workspace */}
      <div className="flex-1 flex relative z-10">
        {/* Desktop sidebar */}
        <AppSidebar isCollapsed={isSidebarCollapsed} onOpenPlaceholder={openPlaceholder} />

        {/* Content */}
        <main
          id="results-main-content"
          className="flex-1 overflow-y-auto"
        >
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h1 className="text-[28px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                    Results &amp; Discussion
                  </h1>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-tight max-w-xl">
                    Publication-quality research figures comparing Single-LLM and Multi-LLM test
                    generation. Select a project &amp; generation below to populate the figures.
                  </p>
                </div>
              </div>
            </div>

            {/* ── QUICK-STATS BAR ─────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
              <StatPill
                label="Multi-LLM Line Cov."
                value={lineCov}
                icon={TrendingUp}
                iconColor="text-emerald-500"
              />
              <StatPill
                label="Multi-LLM Branch Cov."
                value={branchCov}
                icon={GitBranch}
                iconColor="text-blue-500"
              />
              <StatPill
                label="Mutation Score"
                value={mutScore}
                icon={Crosshair}
                iconColor="text-violet-500"
              />
              <StatPill
                label="Refinement Iters"
                value={iterations}
                icon={BarChart3}
                iconColor="text-cyan-500"
              />
            </div>

            {/* ── EXPERIMENT SELECTOR + DISCUSSION SUMMARY ────────────────── */}
            <ResultsOverview
              selectedProjectId={selectedProjectId}
              selectedExperimentId={selectedExperimentId}
              selectedRunId={selectedRunId}
              onProjectChange={handleProjectChange}
              onExperimentChange={handleExperimentChange}
              onRunChange={handleRunChange}
              comparisonData={comparisonData}
              historyData={historyData}
            />

            {/* ── FIG. 3 ──────────────────────────────────────────────────── */}
            <SingleVsMultiChart
              data={comparisonData}
              loading={comparisonLoading}
              error={comparisonError}
            />

            {/* ── FIG. 4 ──────────────────────────────────────────────────── */}
            <RefinementHistoryChart
              data={historyData}
              loading={historyLoading}
              error={historyError}
            />

            {/* ── FIG. 5 ──────────────────────────────────────────────────── */}
            <MutationResultsChart
              data={mutationData}
              loading={mutationLoading}
              error={mutationError}
            />

            {/* Footer */}
            <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center pb-4">
              TestForge AI · Results generated from actual JaCoCo and PIT measurements · No
              fabricated values are displayed
            </p>

          </div>
        </main>
      </div>

      {/* Reusable modal */}
      <DashboardModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((p) => ({ ...p, isOpen: false }))}
        title={modalState.title}
        description={modalState.description}
      />
    </div>
  );
};

export default ResultsPage;
