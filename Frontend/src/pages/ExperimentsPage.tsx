/**
 * ExperimentsPage.tsx - Phase 6 Experiment List and Comparison.
 * Redesigned UI: compact KPI cards, unified filter toolbar, clean table layout,
 * proper loading/error/empty states, AgentRouter provider filter.
 * No backend logic, API, or data model changes.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Plus, RefreshCw, GitCompare, CheckCircle2, XCircle,
  Clock, Loader2, AlertTriangle, Search, BarChart2, TrendingUp,
  Activity, ExternalLink,
} from 'lucide-react';
import { experimentApi } from '../services/experimentApi';
import type { ExperimentOut } from '../services/experimentApi';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';

const CONFIG_LABELS: Record<string, { label: string; badge: string }> = {
  gemini_only:           { label: 'Gemini Only',           badge: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  gemini:                { label: 'Gemini Only',           badge: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  openrouter_only:       { label: 'GPT-4o Only',           badge: 'bg-violet-500/10 text-violet-400 border-violet-500/25' },
  openrouter:            { label: 'GPT-4o Only',           badge: 'bg-violet-500/10 text-violet-400 border-violet-500/25' },
  agentrouter_only:      { label: 'AgentRouter Only',      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  agentrouter:           { label: 'AgentRouter Only',      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  gemini_to_openrouter:  { label: 'Gemini to GPT-4o',     badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' },
  gemini_to_gpt4o:       { label: 'Gemini to GPT-4o',     badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' },
  gemini_to_agentrouter: { label: 'Gemini to AgentRouter', badge: 'bg-teal-500/10 text-teal-400 border-teal-500/25' },
};

const STATUS_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  badge: string; label: string; spin?: boolean;
}> = {
  pending:   { icon: Clock,         badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25',       label: 'Pending' },
  running:   { icon: Loader2,       badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',       label: 'Running', spin: true },
  completed: { icon: CheckCircle2,  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', label: 'Completed' },
  failed:    { icon: XCircle,       badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25',          label: 'Failed' },
  cancelled: { icon: AlertTriangle, badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25',       label: 'Cancelled' },
};

function fmtCoverage(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return (v * 100).toFixed(1) + '%';
}
function fmtDuration(ms: number): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
}
function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function getConfig(key: string) {
  return CONFIG_LABELS[key] ?? { label: key, badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25' };
}
function getStatus(key: string) {
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
}

type FilterStatus   = 'all' | 'pending' | 'running' | 'completed' | 'failed';
type FilterProvider = 'all' | 'gemini' | 'gpt4o' | 'agentrouter' | 'chained';
interface KpiCardProps {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconColor: string; loading?: boolean;
}
function KpiCard({ label, value, icon: Icon, iconBg, iconColor, loading }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-0">
      <div className={`shrink-0 w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{value}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/60">
      {[50, 32, 18, 12, 12, 10, 14, 6].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" style={{ width: w + '%' }} />
        </td>
      ))}
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status);
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${s.badge}`}>
      <Icon className={`w-3 h-3${s.spin ? ' animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}

function ConfigBadge({ config }: { config: string }) {
  const c = getConfig(config);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${c.badge}`}>
      {c.label}
    </span>
  );
}
export function ExperimentsPage() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [experiments, setExperiments] = useState<ExperimentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterProvider, setFilterProvider] = useState<FilterProvider>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const data = await experimentApi.list();
      setExperiments(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);


  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const handleCompare = () => {
    if (selectedIds.size < 2) return;
    navigate('/experiments/compare?ids=' + Array.from(selectedIds).join(','));
  };

  const matchesProvider = (e: ExperimentOut, f: FilterProvider): boolean => {
    if (f === 'all') return true;
    const cfg = e.configuration;
    if (f === 'gemini')      return cfg === 'gemini_only' || cfg === 'gemini';
    if (f === 'gpt4o')       return cfg === 'openrouter_only' || cfg === 'openrouter';
    if (f === 'agentrouter') return cfg === 'agentrouter_only' || cfg === 'agentrouter';
    if (f === 'chained')     return cfg === 'gemini_to_openrouter' || cfg === 'gemini_to_gpt4o' || cfg === 'gemini_to_agentrouter';
    return true;
  };

  const filtered = experiments.filter(e => {
    const statusOk   = filterStatus === 'all' || e.status === filterStatus;
    const providerOk = matchesProvider(e, filterProvider);
    const q = searchQuery.trim().toLowerCase();
    const searchOk   = !q || e.name.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q);
    return statusOk && providerOk && searchOk;
  });

  const completed  = experiments.filter(e => e.status === 'completed');
  const avgLine    = completed.length ? completed.reduce((s, e) => s + (e.line_coverage   ?? 0), 0) / completed.length : null;
  const avgBranch  = completed.length ? completed.reduce((s, e) => s + (e.branch_coverage ?? 0), 0) / completed.length : null;
  const clearFilters = () => { setFilterStatus('all'); setFilterProvider('all'); setSearchQuery(''); };
  const statusFilters: FilterStatus[]   = ['all','pending','running','completed','failed'];
  const providerFilters: { key: FilterProvider; label: string }[] = [
    { key: 'all',         label: 'All' },
    { key: 'gemini',      label: 'Gemini' },
    { key: 'gpt4o',       label: 'GPT-4o' },
    { key: 'agentrouter', label: 'AgentRouter' },
    { key: 'chained',     label: 'Chained' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-800 dark:text-slate-100 flex flex-col relative font-sans">
      <div className="fixed inset-0 bg-dev-grid opacity-10 dark:opacity-15 pointer-events-none z-0" />
      <AppHeader isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenPlaceholder={() => {}} />
      <MobileSidebar isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)} onOpenPlaceholder={() => {}} />
      <div className="flex-1 flex relative z-10">
        <AppSidebar isCollapsed={isSidebarCollapsed} onOpenPlaceholder={() => {}} />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h1 className="text-[28px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight">Experiments</h1>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-tight">Multi-LLM Chaining — Reproducible Benchmark Engine</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {selectedIds.size >= 2 && (
                  <button type="button" id="btn-compare-experiments" onClick={handleCompare}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/25 hover:bg-violet-500/20 transition-all cursor-pointer">
                    <GitCompare className="w-3.5 h-3.5" />Compare ({selectedIds.size})
                  </button>
                )}
                <button type="button" id="btn-refresh-experiments" onClick={() => load(true)}
                  disabled={refreshing || loading} aria-label="Refresh experiments"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                  <RefreshCw className={`w-3.5 h-3.5${refreshing ? ' animate-spin text-cyan-500' : ''}`} />Refresh
                </button>
                <button type="button" id="btn-new-experiment" onClick={() => navigate('/experiments/new')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-white transition-all shadow-sm cursor-pointer">
                  <Plus className="w-4 h-4" />New Experiment
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Experiments" value={loading ? '—' : experiments.length}
                icon={FlaskConical} iconBg="bg-cyan-500/10" iconColor="text-cyan-500" loading={loading} />
              <KpiCard label="Completed" value={loading ? '—' : completed.length}
                icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="text-emerald-500" loading={loading} />
              <KpiCard label="Avg Line Coverage"
                value={loading ? '—' : avgLine != null ? (avgLine * 100).toFixed(1) + '%' : 'N/A'}
                icon={BarChart2} iconBg="bg-blue-500/10" iconColor="text-blue-500" loading={loading} />
              <KpiCard label="Avg Branch Coverage"
                value={loading ? '—' : avgBranch != null ? (avgBranch * 100).toFixed(1) + '%' : 'N/A'}
                icon={TrendingUp} iconBg="bg-violet-500/10" iconColor="text-violet-500" loading={loading} />
            </div>
            {/* FILTER TOOLBAR */}
            <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0 w-12">Status</span>
                    {statusFilters.map(s => (
                      <button key={s} type="button" id={'filter-status-' + s} onClick={() => setFilterStatus(s)}
                        aria-pressed={filterStatus === s}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all capitalize border ${filterStatus === s ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-700 dark:border-slate-600 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0 w-14">Provider</span>
                    {providerFilters.map(({ key, label }) => (
                      <button key={key} type="button" id={'filter-provider-' + key} onClick={() => setFilterProvider(key)}
                        aria-pressed={filterProvider === key}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all border ${filterProvider === key ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-700 dark:border-slate-600 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative sm:w-56 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input id="search-experiments" type="search" placeholder="Search experiments..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search experiments"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-all" />
                </div>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedIds.size} selected{selectedIds.size < 2 ? ' — select ' + (2 - selectedIds.size) + ' more to compare' : ''}
                  </span>
                  <button type="button" onClick={() => setSelectedIds(new Set())}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline underline-offset-2 transition-colors">
                    Clear selection
                  </button>
                </div>
              )}
            </div>
            {/* CONTENT */}
            {loading ? (
              <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Loading experiments">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40">
                        {['Experiment','Configuration','Status','Line Cov.','Branch Cov.','Duration','Created',''].map((h,i) => (
                          <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</tbody>
                  </table>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-[#0d1117] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Unable to load experiments</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                    {error.includes('fetch') || error.includes('network') || error.includes('connect')
                      ? 'Unable to connect to the TestForge API. Check that the backend server is running.'
                      : error}
                  </p>
                </div>
                <button type="button" id="btn-retry-load" onClick={() => load()}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />Retry
                </button>
              </div>
            ) : filtered.length === 0 && experiments.length === 0 ? (
              <div className="flex justify-center">
                <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center w-full max-w-[620px]">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-7 h-7 text-cyan-500" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">No experiments yet</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
                    Create your first benchmark experiment to evaluate single-LLM and multi-LLM Java test-generation pipelines.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button type="button" id="btn-empty-new-experiment" onClick={() => navigate('/experiments/new')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-white transition-all shadow-sm cursor-pointer">
                      <Plus className="w-4 h-4" />New Experiment
                    </button>
                    <button type="button" id="btn-empty-view-projects" onClick={() => navigate('/projects')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-all cursor-pointer">
                      View Projects
                    </button>
                  </div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex justify-center">
                <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center w-full max-w-[500px]">
                  <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No experiments match your filters</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting the status, provider, or search filters.</p>
                  <button type="button" onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all cursor-pointer">
                    Clear all filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/30 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {filtered.length} experiment{filtered.length !== 1 ? 's' : ''}{selectedIds.size > 0 ? ' · ' + selectedIds.size + ' selected' : ''}
                  </span>
                  {selectedIds.size > 0 && (
                    <button type="button" onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline underline-offset-2 transition-colors">
                      Deselect all
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Experiments table">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/60">
                        {['Experiment','Configuration','Status','Line Cov.','Branch Cov.','Duration','Created',''].map((h,i) => (
                          <th key={i} className={`px-4 py-3 ${i >= 3 ? 'text-right' : 'text-left'}`}>
                            {h ? <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{h}</span> : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {filtered.map(exp => {
                        const isSel = selectedIds.has(exp.id);
                        const lcColor = exp.line_coverage != null
                          ? exp.line_coverage >= 0.8 ? 'text-emerald-600 dark:text-emerald-400'
                            : exp.line_coverage >= 0.5 ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500';
                        const bcColor = exp.branch_coverage != null
                          ? exp.branch_coverage >= 0.8 ? 'text-emerald-600 dark:text-emerald-400'
                            : exp.branch_coverage >= 0.5 ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500';
                        return (
                          <tr key={exp.id} className={`group transition-colors ${isSel ? 'bg-cyan-50/60 dark:bg-cyan-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'}`}>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <button type="button" onClick={() => handleSelect(exp.id)}
                                  aria-pressed={isSel}
                                  aria-label={isSel ? 'Deselect ' + exp.name : 'Select ' + exp.name + ' for comparison'}
                                  className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSel ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300 dark:border-slate-600 hover:border-cyan-400'}`}>
                                  {isSel && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                </button>
                                <div className="min-w-0">
                                  <button type="button" onClick={() => navigate('/experiments/' + exp.id)}
                                    className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors truncate block max-w-[240px] text-left cursor-pointer">
                                    {exp.name}
                                  </button>
                                  {exp.description && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[240px]">{exp.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5"><ConfigBadge config={exp.configuration} /></td>
                            <td className="px-4 py-3.5"><StatusBadge status={exp.status} /></td>
                            <td className="px-4 py-3.5 text-right">
                              <span className={`text-sm font-mono font-semibold ${lcColor}`}>{fmtCoverage(exp.line_coverage)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className={`text-sm font-mono font-semibold ${bcColor}`}>{fmtCoverage(exp.branch_coverage)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{fmtDuration(exp.execution_time_ms)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{fmtRelative(exp.created_at)}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button type="button" id={'btn-view-experiment-' + exp.id}
                                onClick={() => navigate('/experiments/' + exp.id)}
                                aria-label={'View details for ' + exp.name}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-300/50 dark:border-cyan-700/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer">
                                View<ExternalLink className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/30 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Showing {filtered.length} of {experiments.length} experiments</span>
                  <button type="button" id="btn-table-new-experiment" onClick={() => navigate('/experiments/new')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-300/50 dark:border-cyan-700/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />New Experiment
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default ExperimentsPage;