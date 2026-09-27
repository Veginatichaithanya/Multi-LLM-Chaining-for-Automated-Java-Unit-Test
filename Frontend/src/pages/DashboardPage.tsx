import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentProjects } from '../components/dashboard/RecentProjects';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { PipelinePreview } from '../components/dashboard/PipelinePreview';
import { ResearchOverview } from '../components/dashboard/ResearchOverview';
import { DashboardModal } from '../components/dashboard/DashboardModal';
import { projectApi } from '../services/projectApi';
import { FolderGit2, PlayCircle, FlaskConical, FileText } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal state for placeholder routes/actions
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Real PostgreSQL count for projects
  const [projectsCount, setProjectsCount] = useState<number | string>('--');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    projectApi
      .list()
      .then((res) => {
        if (isMounted) {
          setProjectsCount(res.total);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[DashboardPage] Unable to fetch real project count:', err);
        if (isMounted) {
          setProjectsCount('--');
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const openPlaceholder = (title: string, description: string) => {
    setModalState({
      isOpen: true,
      title,
      description,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleQuickActionClick = (title: string, description: string) => {
    if (title === 'New Analysis') {
      navigate('/new-analysis');
    } else if (title === 'Projects') {
      navigate('/projects');
    } else {
      openPlaceholder(title, description);
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
        onOpenPlaceholder={openPlaceholder}
      />

      {/* Mobile Drawer */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenPlaceholder={openPlaceholder}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex relative z-10">
        {/* Desktop Sidebar */}
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onOpenPlaceholder={openPlaceholder}
        />

        {/* Main Content Area */}
        <main
          id="main-content"
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto"
        >
          {/* Dashboard Header */}
          <DashboardHeader
            onNewAnalysis={() => navigate('/new-analysis')}
            onViewProjects={() => navigate('/projects')}
          />

          {/* 4 Summary Cards - Projects connected to PostgreSQL, unmeasured metrics strictly '--' */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Workspace Metrics
              </h2>
              <span className="text-[11px] font-mono text-cyan-400">
                {isLoading ? 'Connecting PostgreSQL...' : 'PostgreSQL Connected'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Projects"
                value={String(projectsCount)}
                description="Java projects in PostgreSQL"
                icon={FolderGit2}
                accentColor="cyan"
              />
              <SummaryCard
                title="Test Runs"
                value="--"
                description="Automated test executions"
                icon={PlayCircle}
                accentColor="teal"
              />
              <SummaryCard
                title="Experiments"
                value="--"
                description="Model comparison experiments"
                icon={FlaskConical}
                accentColor="indigo"
              />
              <SummaryCard
                title="Reports"
                value="--"
                description="Generated evaluation reports"
                icon={FileText}
                accentColor="amber"
              />
            </div>
          </section>

          {/* Quick Actions */}
          <QuickActions onActionClick={handleQuickActionClick} />

          {/* Pipeline Visualizer */}
          <PipelinePreview />

          {/* Research Configuration Matrix */}
          <ResearchOverview
            onConfigureExperiments={() =>
              openPlaceholder(
                'Experiments Configuration',
                'Compare single-LLM (Gemini / OpenAI) vs chained multi-LLM execution.'
              )
            }
          />

          {/* Recent Projects & Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentProjects onCreateProject={() => navigate('/new-analysis')} />
            <RecentActivity />
          </div>
        </main>
      </div>

      {/* Reusable Dashboard Modal */}
      <DashboardModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
      />
    </div>
  );
};

export default DashboardPage;
