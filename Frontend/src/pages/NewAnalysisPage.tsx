import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import { projectApi } from '../services/projectApi';
import {
  Sparkles,
  ArrowLeft,
  FolderPlus,
  Layers,
  FileCode,
  Info,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [javaVersion, setJavaVersion] = useState('17');
  const [buildTool, setBuildTool] = useState('Maven');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newProject = await projectApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        language: 'Java',
        java_version: javaVersion,
        build_tool: buildTool,
      });

      // Navigate to Project Details page
      navigate(`/projects/${newProject.id}`);
    } catch (err: unknown) {
      console.error('Failed to create project:', err);
      setError('Failed to create project in database. Please verify the backend connection.');
      setIsSubmitting(false);
    }
  };

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
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto"
        >
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  Pipeline Setup
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>New Analysis Project</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl bg-[#090d16] border border-slate-800/90 p-6 sm:p-8 shadow-xl shadow-black/40">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-2">
                <label
                  htmlFor="project-name"
                  className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300"
                >
                  Project Name <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <FolderPlus className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="project-name"
                    type="text"
                    required
                    placeholder="e.g. Calculator Testing, Order Processing Service"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b101c] border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  A descriptive name for your Java repository or module.
                </p>
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <label
                  htmlFor="project-desc"
                  className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="project-desc"
                  rows={3}
                  placeholder="Target package, test objectives, or JUnit 5 edge cases to explore..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0b101c] border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70 transition-colors resize-none"
                />
              </div>

              {/* Configuration Grid: Java Version & Build Tool */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Java Version */}
                <div className="space-y-2">
                  <label
                    htmlFor="java-version"
                    className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Java Version</span>
                  </label>
                  <select
                    id="java-version"
                    value={javaVersion}
                    onChange={(e) => setJavaVersion(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101c] border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70 transition-colors cursor-pointer"
                  >
                    <option value="17">Java 17 (LTS - Recommended)</option>
                    <option value="21">Java 21 (LTS)</option>
                    <option value="11">Java 11 (LTS)</option>
                  </select>
                </div>

                {/* Build Tool */}
                <div className="space-y-2">
                  <label
                    htmlFor="build-tool"
                    className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    <span>Build Tool</span>
                  </label>
                  <select
                    id="build-tool"
                    value={buildTool}
                    onChange={(e) => setBuildTool(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101c] border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70 transition-colors cursor-pointer"
                  >
                    <option value="Maven">Maven (Fully Supported)</option>
                    <option value="Gradle">Gradle (Experimental)</option>
                  </select>
                </div>
              </div>

              {/* Informational Callout when Gradle is selected */}
              {buildTool === 'Gradle' && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Notice:</span>
                    Gradle execution support is not yet configured. Maven is currently the fully supported execution engine for automated JUnit runs and JaCoCo coverage.
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-950/50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Project...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Create Project &amp; Continue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NewAnalysisPage;
