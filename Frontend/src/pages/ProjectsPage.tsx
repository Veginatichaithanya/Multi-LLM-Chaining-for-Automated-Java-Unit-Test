import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import { projectApi, type Project } from '../services/projectApi';
import {
  FolderGit2,
  Plus,
  RefreshCw,
  Search,
  FileCode2,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Cpu,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await projectApi.list();
      setProjects(response.projects);
    } catch (err: unknown) {
      console.error('Failed to load projects:', err);
      setError('Unable to load projects from the database. Ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? This will permanently remove all associated source files and test generations.')) {
      return;
    }
    setIsDeleting(projectId);
    try {
      await projectApi.delete(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.build_tool && p.build_tool.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'ready':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </span>
        );
      case 'analyzing':
      case 'generating':
      case 'refining':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 animate-pulse">
            <Cpu className="w-3 h-3" /> {status}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-950/60 border border-rose-800/60 text-rose-400">
            <XCircle className="w-3 h-3" /> {status}
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-800/80 border border-slate-700/80 text-slate-300">
            <Clock className="w-3 h-3" /> {status || 'Draft'}
          </span>
        );
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
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto"
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/70 flex items-center justify-center text-cyan-400 shadow-sm">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
              </div>
              <p className="text-sm text-slate-400">
                Manage your Java source projects and test-generation workflows.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchProjects}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                title="Refresh projects"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/new-analysis')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Analysis</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0b101c] border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-colors"
              />
            </div>

            <div className="text-xs font-mono text-slate-400 self-end sm:self-auto">
              Total Projects:{' '}
              <span className="text-cyan-400 font-semibold">{projects.length}</span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[#090d16]/70 border border-slate-800/80 p-5 space-y-4 animate-pulse"
                >
                  <div className="h-5 bg-slate-800/60 rounded w-2/3" />
                  <div className="h-3 bg-slate-800/40 rounded w-full" />
                  <div className="h-3 bg-slate-800/40 rounded w-4/5" />
                  <div className="h-8 bg-slate-800/30 rounded mt-4" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && projects.length === 0 && !error && (
            <div className="relative overflow-hidden flex flex-col items-center justify-center p-12 sm:p-16 text-center rounded-3xl glass-panel border border-slate-800/80 space-y-4 my-8 shadow-2xl">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 animate-radar-wave pointer-events-none" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-teal-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50 animate-float">
                  <FolderGit2 className="w-7 h-7 stroke-[1.75]" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-white tracking-tight">No projects yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Create your first Java project to begin automated multi-LLM test synthesis with Gemini and GPT-4o.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/new-analysis')}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ New Analysis</span>
              </button>
            </div>
          )}

          {/* Projects Grid */}
          {!isLoading && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group rounded-2xl bg-[#090d16] hover:bg-[#0c1220] border border-slate-800/80 hover:border-cyan-500/50 p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Subtle top border glow on hover */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="space-y-3">
                    {/* Card Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {project.description || 'No description provided.'}
                        </p>
                      </div>
                      <div className="shrink-0">{getStatusBadge(project.status)}</div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 flex items-center gap-1">
                        <FileCode2 className="w-3 h-3" /> Java {project.java_version || '17'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-950/40 border border-teal-800/40 text-teal-300 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {project.build_tool || 'Maven'}
                      </span>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/60 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Source Files</span>
                        <span className="text-slate-200 font-semibold">
                          {project.source_file_count ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Coverage</span>
                        <span className="text-slate-200 font-semibold">
                          {project.latest_coverage !== null && project.latest_coverage !== undefined
                            ? `${project.latest_coverage.toFixed(1)}%`
                            : '--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Date & Actions */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, project.id)}
                        disabled={isDeleting === project.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1 text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform">
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No search results */}
          {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No projects matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectsPage;
