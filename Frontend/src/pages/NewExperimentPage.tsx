/**
 * NewExperimentPage.tsx — Phase 6 Create Experiment Wizard.
 *
 * Allows the user to:
 * 1. Select a project
 * 2. Name the experiment
 * 3. Choose a configuration (Gemini Only / GPT-4o Only / Gemini → GPT-4o)
 * 4. Set max refinement iterations (1–5)
 * 5. Submit — creates the experiment via the backend API
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FlaskConical,
  ArrowLeft,
  Cpu,
  Zap,
  GitMerge,
  ChevronRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { experimentApi } from '../services/experimentApi';
import type { ExperimentConfiguration } from '../services/experimentApi';
import { projectApi } from '../services/projectApi';
import type { Project } from '../services/projectApi';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';

// ── Configuration definitions ────────────────────────────────────────────────

interface ConfigOption {
  key: ExperimentConfiguration;
  label: string;
  shortLabel: string;
  description: string;
  pipeline: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  border: string;
  bg: string;
  gradient: string;
  initialProvider: string;
  initialModel: string;
  refinementProvider: string | null;
  refinementModel: string | null;
  showIterations: boolean;
}

const CONFIGURATIONS: ConfigOption[] = [
  {
    key: 'gemini_only',
    label: 'Configuration A — Gemini Only',
    shortLabel: 'Gemini Only',
    description:
      'Google Gemini 2.5 Flash generates JUnit 5 tests for the target Java class. Maven compiles and runs the tests. JaCoCo measures line and branch coverage in a single pass.',
    pipeline: ['Source Analysis', 'Gemini Generation', 'Maven Build', 'JUnit Execution', 'JaCoCo Coverage'],
    icon: Cpu,
    color: 'text-blue-300',
    border: 'border-blue-700/60',
    bg: 'bg-blue-950/20',
    gradient: 'from-blue-900/30 to-blue-950/10',
    initialProvider: 'gemini',
    initialModel: 'gemini-2.5-flash-lite',
    refinementProvider: null,
    refinementModel: null,
    showIterations: false,
  },
  {
    key: 'openrouter_only',
    label: 'Configuration B — GPT-4o Only',
    shortLabel: 'GPT-4o Only',
    description:
      'OpenRouter GPT-4o generates JUnit 5 tests for the target Java class. Maven compiles and runs the tests. JaCoCo measures line and branch coverage in a single pass.',
    pipeline: ['Source Analysis', 'GPT-4o Generation', 'Maven Build', 'JUnit Execution', 'JaCoCo Coverage'],
    icon: Zap,
    color: 'text-violet-300',
    border: 'border-violet-700/60',
    bg: 'bg-violet-950/20',
    gradient: 'from-violet-900/30 to-violet-950/10',
    initialProvider: 'openrouter',
    initialModel: 'openai/gpt-4o',
    refinementProvider: 'openrouter',
    refinementModel: 'openai/gpt-4o',
    showIterations: false,
  },
  {
    key: 'gemini_to_openrouter',
    label: 'Configuration C — Gemini → GPT-4o Chain',
    shortLabel: 'Gemini → GPT-4o',
    description:
      'Gemini generates the initial test suite. Maven + JaCoCo executes and measures coverage. Structured feedback (failures + gaps) is passed to GPT-4o, which refines tests iteratively until the target coverage is reached or max iterations are exhausted.',
    pipeline: [
      'Source Analysis',
      'Gemini Generation',
      'Maven Build',
      'JUnit Execution',
      'JaCoCo Coverage',
      'Feedback Synthesis',
      'GPT-4o Refinement',
      'Re-Execution',
      '(Repeat until max iterations)',
    ],
    icon: GitMerge,
    color: 'text-cyan-300',
    border: 'border-cyan-700/60',
    bg: 'bg-cyan-950/20',
    gradient: 'from-cyan-900/30 to-cyan-950/10',
    initialProvider: 'gemini',
    initialModel: 'gemini-2.5-flash-lite',
    refinementProvider: 'openrouter',
    refinementModel: 'openai/gpt-4o',
    showIterations: true,
  },
  {
    key: 'agentrouter_only',
    label: 'Configuration D — AgentRouter Only',
    shortLabel: 'AgentRouter Only',
    description:
      'AgentRouter gpt-4o generates JUnit 5 tests for the target Java class. Maven compiles and runs the tests. JaCoCo measures line and branch coverage in a single pass.',
    pipeline: ['Source Analysis', 'AgentRouter Generation', 'Maven Build', 'JUnit Execution', 'JaCoCo Coverage'],
    icon: Zap,
    color: 'text-amber-300',
    border: 'border-amber-700/60',
    bg: 'bg-amber-950/20',
    gradient: 'from-amber-900/30 to-amber-950/10',
    initialProvider: 'agentrouter',
    initialModel: 'gpt-4o',
    refinementProvider: 'agentrouter',
    refinementModel: 'gpt-4o',
    showIterations: false,
  },
  {
    key: 'gemini_to_agentrouter',
    label: 'Configuration E — Gemini → AgentRouter Chain',
    shortLabel: 'Gemini → AgentRouter',
    description:
      'Gemini generates initial tests. Maven + JaCoCo executes and measures coverage. Structured feedback is passed to AgentRouter (gpt-4o), which refines tests iteratively until target coverage is reached.',
    pipeline: [
      'Source Analysis',
      'Gemini Generation',
      'Maven Build',
      'JUnit Execution',
      'JaCoCo Coverage',
      'Feedback Synthesis',
      'AgentRouter Refinement',
      'Re-Execution',
      '(Repeat until max iterations)',
    ],
    icon: GitMerge,
    color: 'text-teal-300',
    border: 'border-teal-700/60',
    bg: 'bg-teal-950/20',
    gradient: 'from-teal-900/30 to-teal-950/10',
    initialProvider: 'gemini',
    initialModel: 'gemini-2.5-flash-lite',
    refinementProvider: 'agentrouter',
    refinementModel: 'gpt-4o',
    showIterations: true,
  },
];

// ── Pipeline Step badge ──────────────────────────────────────────────────────

function PipelineSteps({ steps, color }: { steps: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${color} border-opacity-40 bg-opacity-10`}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight className="w-3 h-3 text-slate-600 self-center shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function NewExperimentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [selectedConfig, setSelectedConfig] = useState<ConfigOption>(CONFIGURATIONS[2]); // Default: chained
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(searchParams.get('project_id') ?? '');
  const [maxIterations, setMaxIterations] = useState(3);
  const [framework] = useState('junit5');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [projectError, setProjectError] = useState('');

  // Load projects on mount
  useEffect(() => {
    setProjectsLoading(true);
    projectApi
      .list()
      .then((res) => setProjects(res.projects))
      .catch((e: unknown) =>
        setProjectsError(e instanceof Error ? e.message : 'Failed to load projects'),
      )
      .finally(() => setProjectsLoading(false));
  }, []);

  // Auto-name when config changes
  const selectedProject = projects.find((p) => p.id === projectId);

  const handleConfigSelect = (cfg: ConfigOption) => {
    setSelectedConfig(cfg);
    if (!name || CONFIGURATIONS.some((c) => name.startsWith(c.shortLabel))) {
      setName(
        selectedProject
          ? `${cfg.shortLabel} — ${selectedProject.name}`
          : cfg.shortLabel,
      );
    }
  };

  useEffect(() => {
    if (selectedProject) {
      setName(`${selectedConfig.shortLabel} — ${selectedProject.name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const validate = () => {
    let ok = true;
    if (!name.trim()) { setNameError('Experiment name is required.'); ok = false; }
    else setNameError('');
    if (!projectId) { setProjectError('Please select a project.'); ok = false; }
    else setProjectError('');
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const exp = await experimentApi.create({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        configuration: selectedConfig.key,
        initial_provider: selectedConfig.initialProvider,
        initial_model: selectedConfig.initialModel,
        refinement_provider: selectedConfig.refinementProvider ?? undefined,
        refinement_model: selectedConfig.refinementModel ?? undefined,
        max_iterations: selectedConfig.showIterations ? maxIterations : 1,
        framework,
      });
      navigate(`/experiments/${exp.id}`);
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : 'Failed to create experiment',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto w-full space-y-6 overflow-y-auto"
        >
          {/* Header Section */}
          <div className="flex items-center gap-4 border-b border-slate-800/80 pb-6">
            <button
              type="button"
              onClick={() => navigate('/experiments')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Back to Experiments"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/70 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">New Experiment</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Configure a reproducible multi-LLM benchmark run</p>
              </div>
            </div>
          </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-8">

          {/* ── Step 1: Select Configuration ─────────────────────────────── */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-200">
                1. Select Experiment Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose which LLM(s) to use for test generation and refinement.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CONFIGURATIONS.map((cfg) => {
                const Icon = cfg.icon;
                const isSelected = selectedConfig.key === cfg.key;
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    onClick={() => handleConfigSelect(cfg)}
                    className={`relative text-left rounded-2xl border p-5 transition-all duration-200 ${
                      isSelected
                        ? `${cfg.border} bg-gradient-to-br ${cfg.gradient} shadow-lg`
                        : 'border-slate-800/80 bg-[#090d16] hover:border-slate-700/60 hover:bg-[#0b1020]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 mb-3 ${isSelected ? cfg.color : 'text-slate-500'}`} />
                    <h3 className={`text-sm font-semibold mb-1 ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                      {cfg.shortLabel}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {cfg.description}
                    </p>
                    {isSelected && (
                      <PipelineSteps steps={cfg.pipeline} color={cfg.color} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Step 2: Project ──────────────────────────────────────────── */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-200">2. Target Project</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select the Java project to run tests against.
              </p>
            </div>

            {projectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading projects…
              </div>
            ) : projectsError ? (
              <div className="flex items-center gap-2 text-sm text-rose-400">
                <AlertTriangle className="w-4 h-4" /> {projectsError}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-[#090d16] border border-slate-800/80 rounded-xl p-5 text-center">
                <p className="text-sm text-slate-400">No projects found.</p>
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Create a project first
                </button>
              </div>
            ) : (
              <div>
                <select
                  id="experiment-project-select"
                  value={projectId}
                  onChange={(e) => { setProjectId(e.target.value); setProjectError(''); }}
                  className={`w-full bg-[#090d16] border rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                    projectError
                      ? 'border-rose-700/60 focus:ring-rose-700/40'
                      : 'border-slate-700/60 focus:ring-cyan-700/40 focus:border-cyan-700/60'
                  }`}
                >
                  <option value="">— Select a project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.source_file_count} source file{p.source_file_count !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
                {projectError && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {projectError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Step 3: Experiment Details ───────────────────────────────── */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-200">3. Experiment Details</h2>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="experiment-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Experiment Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="experiment-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  placeholder="e.g. Gemini → GPT-4o — Calculator.java"
                  maxLength={200}
                  className={`w-full bg-[#090d16] border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    nameError
                      ? 'border-rose-700/60 focus:ring-rose-700/40'
                      : 'border-slate-700/60 focus:ring-cyan-700/40 focus:border-cyan-700/60'
                  }`}
                />
                {nameError && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {nameError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="experiment-description" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="experiment-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief notes about the research objective or hypothesis…"
                  className="w-full bg-[#090d16] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-700/40 focus:border-cyan-700/60 resize-none transition-all"
                />
              </div>

              {/* Max Iterations — only for chained config */}
              {selectedConfig.showIterations && (
                <div>
                  <label htmlFor="experiment-iterations" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Max Refinement Iterations
                    <span className="ml-2 text-[10px] font-mono text-slate-500">(1 – 5)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      id="experiment-iterations"
                      type="range"
                      min={1}
                      max={5}
                      value={maxIterations}
                      onChange={(e) => setMaxIterations(Number(e.target.value))}
                      className="flex-1 accent-cyan-500"
                    />
                    <span className="text-2xl font-bold font-mono text-cyan-300 w-8 text-center">
                      {maxIterations}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    GPT-4o will refine the test suite up to {maxIterations} time{maxIterations !== 1 ? 's' : ''},
                    stopping early if the target coverage is reached.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ── Step 4: Review & Submit ──────────────────────────────────── */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-200">4. Review & Create</h2>
            </div>

            {/* Summary card */}
            <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-5 space-y-3 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Configuration</span>
                  <span className="font-medium text-slate-200">{selectedConfig.shortLabel}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Initial LLM</span>
                  <span className="font-medium text-slate-200 font-mono">{selectedConfig.initialModel}</span>
                </div>
                {selectedConfig.refinementModel && (
                  <div>
                    <span className="text-slate-500 block mb-0.5">Refinement LLM</span>
                    <span className="font-medium text-slate-200 font-mono">{selectedConfig.refinementModel}</span>
                  </div>
                )}
                {selectedConfig.showIterations && (
                  <div>
                    <span className="text-slate-500 block mb-0.5">Max Iterations</span>
                    <span className="font-bold text-cyan-300 font-mono">{maxIterations}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block mb-0.5">Project</span>
                  <span className="font-medium text-slate-200 truncate block">
                    {selectedProject?.name ?? (projectId ? '...' : 'Not selected')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Framework</span>
                  <span className="font-medium text-slate-200 font-mono">JUnit 5</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  After creation, the experiment will be in <span className="text-slate-300 font-mono">pending</span> state.
                  Click <span className="text-cyan-300 font-medium">Run Experiment</span> on the details page to start execution.
                  All metrics are captured from actual Maven, JUnit, and JaCoCo execution — no values are fabricated.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="flex items-start gap-3 p-4 mb-4 rounded-xl bg-rose-950/30 border border-rose-800/60 text-sm text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting || projectsLoading}
                id="create-experiment-btn"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-cyan-600/90 hover:bg-cyan-500/90 text-white border border-cyan-500/60 transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4" />
                    Create Experiment
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/experiments')}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-300 bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 transition-all"
              >
                Cancel
              </button>
            </div>
          </section>
        </form>
        </main>
      </div>
    </div>
  );
}

export default NewExperimentPage;
