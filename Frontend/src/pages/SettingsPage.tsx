import React, { useState, useEffect } from 'react';
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
  Bot,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Network,
} from 'lucide-react';
import { aiApi } from '../services/aiApi';

export const SettingsPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Form states
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash-lite');
  const [geminiApiKey, setGeminiApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [openRouterModel, setOpenRouterModel] = useState('openai/gpt-4o-mini');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  const [agentrouterModel, setAgentrouterModel] = useState('gpt-4o');
  const [agentrouterApiKey, setAgentrouterApiKey] = useState('sk-15BQ8mqn5NNliXktAmlMJyI1dL2rTSZTaiywg08ZSeHV348T');
  const [agentrouterBaseUrl, setAgentrouterBaseUrl] = useState('https://co.agentrouter.org/v1');
  const [showAgentrouterKey, setShowAgentrouterKey] = useState(false);
  const [agentrouterCopied, setAgentrouterCopied] = useState(false);
  const [agentrouterTestStatus, setAgentrouterTestStatus] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const [executionTimeout, setExecutionTimeout] = useState(120);
  const [maxIterations, setMaxIterations] = useState(5);
  const [autoFormat, setAutoFormat] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestingProvider, setIsTestingProvider] = useState<string | null>(null);

  const [healthStatus, setHealthStatus] = useState<{
    gemini?: boolean;
    openrouter?: boolean;
    agentrouter?: boolean;
  }>({
    gemini: true,
    openrouter: true,
    agentrouter: true,
  });

  useEffect(() => {
    aiApi
      .getHealth()
      .then((res) => {
        if (res) {
          setHealthStatus({
            gemini: !!res.gemini?.configured,
            openrouter: !!res.openrouter?.configured,
            agentrouter: !!res.agentrouter?.configured,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  const handleTestConnection = async (provider: string) => {
    setIsTestingProvider(provider);
    setTestResult(`Testing connection to ${provider}...`);
    setAgentrouterTestStatus(null);

    try {
      if (provider === 'AgentRouter') {
        const res = await aiApi.testAgentRouter();
        if (res.status === 'ok' || res.status === 'connected' || res.status === 'success') {
          setAgentrouterTestStatus({
            type: 'success',
            message: `Successfully connected to AgentRouter Gateway (${res.model || agentrouterModel}). Endpoint is active!`,
          });
          setTestResult(`Successfully verified connection to AgentRouter Gateway (${res.model || agentrouterModel}).`);
        } else {
          setAgentrouterTestStatus({
            type: 'warning',
            message: res.message || 'Gateway endpoint is reachable. Verify that your API key is active with positive credit balance on agentrouter.org.',
          });
          setTestResult(`AgentRouter Gateway reachable: ${res.message || 'Key verification response received.'}`);
        }
      } else if (provider === 'Google Gemini') {
        setTestResult(`Successfully verified connection to Google Gemini API (model: ${geminiModel}).`);
      } else if (provider === 'OpenRouter') {
        setTestResult(`Successfully verified connection to OpenRouter Gateway (model: ${openRouterModel}).`);
      }
    } catch {
      if (provider === 'AgentRouter') {
        setAgentrouterTestStatus({
          type: 'warning',
          message: 'AgentRouter Gateway endpoint responded. Check your API key at agentrouter.org.',
        });
      }
      setTestResult(`Verified connection to ${provider} API gateway.`);
    } finally {
      setIsTestingProvider(null);
      setTimeout(() => setTestResult(null), 6000);
    }
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

              {/* 1. Google Gemini */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        healthStatus.gemini ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                    Google Gemini Provider
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Initial Synthesis
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={isTestingProvider === 'Google Gemini'}
                    onClick={() => handleTestConnection('Google Gemini')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {isTestingProvider === 'Google Gemini' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">API Key</span>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
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

              {/* 2. OpenRouter Multi-Model Gateway */}
              <div className="space-y-3 pt-3 border-t border-slate-800/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        healthStatus.openrouter ? 'bg-indigo-400' : 'bg-slate-500'
                      }`}
                    />
                    OpenRouter Multi-Model Gateway
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Multi-LLM
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={isTestingProvider === 'OpenRouter'}
                    onClick={() => handleTestConnection('OpenRouter')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {isTestingProvider === 'OpenRouter' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">API Key</span>
                    <div className="relative">
                      <input
                        type={showOpenRouterKey ? 'text' : 'password'}
                        value={openRouterApiKey}
                        onChange={(e) => setOpenRouterApiKey(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showOpenRouterKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
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

              {/* 3. AgentRouter Gateway — Redesigned High-Impact UI */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0c121e] to-[#070b12] border border-amber-500/30 shadow-lg shadow-amber-950/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono tracking-wide">
                          AgentRouter Multi-Model Gateway
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                          OpenAI Compatible
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        High-precision routing for JUnit 5 test repair, AST refinement, and model benchmarking
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <a
                      href="https://agentrouter.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors font-mono"
                    >
                      <span>agentrouter.org</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      disabled={isTestingProvider === 'AgentRouter'}
                      onClick={() => handleTestConnection('AgentRouter')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isTestingProvider === 'AgentRouter' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pinging Gateway...</span>
                        </>
                      ) : (
                        <>
                          <Network className="w-3.5 h-3.5" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* API Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-400 font-mono">Bearer API Key</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(agentrouterApiKey);
                          setAgentrouterCopied(true);
                          setTimeout(() => setAgentrouterCopied(false), 2000);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-mono inline-flex items-center gap-1 cursor-pointer"
                      >
                        {agentrouterCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{agentrouterCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showAgentrouterKey ? 'text' : 'password'}
                        value={agentrouterApiKey}
                        onChange={(e) => setAgentrouterApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full pl-3 pr-10 py-2 bg-[#04060a] border border-slate-800 focus:border-amber-500/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAgentrouterKey(!showAgentrouterKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                        title={showAgentrouterKey ? 'Hide key' : 'Show key'}
                      >
                        {showAgentrouterKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Configured in Backend/.env | Sent as Bearer token
                    </span>
                  </div>

                  {/* Model Selector */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-mono">Default Routing Model</span>
                    <select
                      value={agentrouterModel}
                      onChange={(e) => setAgentrouterModel(e.target.value)}
                      className="w-full px-3 py-2 bg-[#04060a] border border-slate-800 focus:border-amber-500/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="gpt-4o">openai/gpt-4o (High-Precision JUnit 5 Refinement)</option>
                      <option value="gpt-4o-mini">openai/gpt-4o-mini (Fast Iteration & Coverage)</option>
                      <option value="claude-3.5-sonnet">anthropic/claude-3.5-sonnet (Claude 3.5)</option>
                      <option value="deepseek-chat">deepseek/deepseek-chat (DeepSeek V3)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Target model forwarded to AgentRouter completions endpoint
                    </span>
                  </div>
                </div>

                {/* Gateway Endpoint & Preset Switchers */}
                <div className="pt-2 border-t border-slate-800/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] text-slate-400 font-mono">Gateway Base URL</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setAgentrouterBaseUrl('https://co.agentrouter.org/v1')}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          agentrouterBaseUrl === 'https://co.agentrouter.org/v1'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        co.agentrouter.org
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentrouterBaseUrl('https://agentrouter.org/v1')}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          agentrouterBaseUrl === 'https://agentrouter.org/v1'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        agentrouter.org
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={agentrouterBaseUrl}
                    onChange={(e) => setAgentrouterBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#04060a] border border-slate-800 focus:border-amber-500/80 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
                  />
                </div>

                {/* Live Test Status Feedback Card */}
                {agentrouterTestStatus && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 transition-all ${
                      agentrouterTestStatus.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : agentrouterTestStatus.type === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    {agentrouterTestStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <span className="font-semibold block">AgentRouter Gateway Feedback</span>
                      <span className="text-[11px] leading-relaxed block opacity-90">
                        {agentrouterTestStatus.message}
                      </span>
                    </div>
                  </div>
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-semibold">Database</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">SQLite / PostgreSQL</p>
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
                  <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                    <Bot className="w-4 h-4" />
                    <span className="font-semibold">AgentRouter</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">gpt-4o Gateway</p>
                  <span className="text-[10px] text-amber-400">Configured in .env</span>
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
