import React, { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import {
  Settings,
  Key,
  Cpu,
  CheckCircle2,
  Server,
  User,
  Save,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Form states
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash-lite');
  const [geminiApiKey, setGeminiApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [openRouterModel, setOpenRouterModel] = useState('openai/gpt-4o-mini');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [executionTimeout, setExecutionTimeout] = useState(120);
  const [maxIterations, setMaxIterations] = useState(5);
  const [autoFormat, setAutoFormat] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  const handleTestConnection = (provider: string) => {
    setTestResult(`Testing connection to ${provider}...`);
    setTimeout(() => {
      setTestResult(`Successfully verified connection to ${provider} API (latency: 182ms).`);
      setTimeout(() => setTestResult(null), 4000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AppHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenPlaceholder={() => {}}
      />

      <div className="flex-1 flex w-full">
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onOpenPlaceholder={() => {}}
        />

        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onOpenPlaceholder={() => {}}
        />

        <main className="flex-1 min-w-0 px-4 md:px-8 py-8 space-y-6 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                  <Settings className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                  Platform & Pipeline Settings
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-400">
                Configure Multi-LLM provider models, API credentials, execution sandbox timeouts, and system parameters.
              </p>
            </div>

            {savedSuccess && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully
              </div>
            )}
          </div>

          {testResult && (
            <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {testResult}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: AI Providers */}
            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-6 space-y-5">
              <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800/60 pb-3">
                <Key className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider font-mono">
                  Multi-LLM Provider API Configuration
                </h2>
              </div>

              {/* Gemini */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Google Gemini Provider
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('Google Gemini')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Test Connection
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">API Key</span>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Default Model</span>
                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Recommended)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* OpenRouter */}
              <div className="space-y-3 pt-3 border-t border-slate-800/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    OpenRouter Multi-Model Gateway
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('OpenRouter')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Test Connection
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">API Key</span>
                    <input
                      type="password"
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Default Model</span>
                    <select
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="openai/gpt-4o-mini">openai/gpt-4o-mini (Fast & Cost Efficient)</option>
                      <option value="openai/gpt-4o">openai/gpt-4o</option>
                      <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                      <option value="deepseek/deepseek-coder">deepseek/deepseek-coder</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Sandbox & Execution Constraints */}
            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-6 space-y-5">
              <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800/60 pb-3">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider font-mono">
                  Sandbox & Test Execution Constraints
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">
                    Execution Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={executionTimeout}
                    onChange={(e) => setExecutionTimeout(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Maximum time allowed per JUnit and PIT mutation test run.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">
                    Max Refinement Iterations
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Upper boundary for iterative compiler repair and mutant killing passes.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFormat}
                    onChange={(e) => setAutoFormat(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-200 block">
                      Auto-Format Generated Java Source
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Runs Google Java Format on all newly generated or refined test methods.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 3: System Environment */}
            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800/60 pb-3">
                <Server className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider font-mono">
                  Environment & Connected Services
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-semibold">PostgreSQL</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">localhost:5432/testforge_ai</p>
                  <span className="text-[10px] text-emerald-500">Connected & Synced</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                    <Cpu className="w-4 h-4" />
                    <span className="font-semibold">Java Runtime</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">OpenJDK 17 / 21 LTS</p>
                  <span className="text-[10px] text-cyan-400">Available on PATH</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                    <User className="w-4 h-4" />
                    <span className="font-semibold">Active Session</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">demo@testforge.ai</p>
                  <span className="text-[10px] text-indigo-400">Lead AI Engineer</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold
                           bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer shadow-lg
                           shadow-cyan-500/20 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Saving Configuration...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};
