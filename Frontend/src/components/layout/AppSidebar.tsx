import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderGit2,
  Sparkles,
  FlaskConical,
  FileText,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react';


interface AppSidebarProps {
  isCollapsed: boolean;
  onOpenPlaceholder: (title: string, description: string) => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isRealRoute: boolean;
  path?: string;
  badge?: string;
  description: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isCollapsed, onOpenPlaceholder }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isRealRoute: true,
      path: '/dashboard',
      description: 'Workspace overview and pipeline metrics',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      isRealRoute: true,
      path: '/projects',
      description: 'Manage imported Java source projects and repositories',
    },
    {
      id: 'new-analysis',
      label: 'New Analysis',
      icon: Sparkles,
      isRealRoute: true,
      path: '/new-analysis',
      badge: 'New',
      description: 'Upload Java classes and execute multi-LLM test synthesis',
    },
    {
      id: 'results',
      label: 'Results',
      icon: BarChart3,
      isRealRoute: true,
      path: '/results',
      description: 'Research figures: Single-LLM vs Multi-LLM comparison',
    },
    {
      id: 'experiments',
      label: 'Experiments',
      icon: FlaskConical,
      isRealRoute: true,
      path: '/experiments',
      description: 'Compare single-LLM vs multi-LLM generation configurations',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      isRealRoute: false,
      description: 'Review JaCoCo code coverage and JUnit test reports',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      isRealRoute: false,
      description: 'Configure API models, sandbox constraints, and credentials',
    },
  ];

  const handleItemClick = (item: NavItemConfig, e: React.MouseEvent) => {
    if (!item.isRealRoute) {
      e.preventDefault();
      onOpenPlaceholder(item.label, item.description);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`hidden md:flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 bg-[#090d16] border-r border-slate-800/80 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20 px-2 py-4' : 'w-64 px-4 py-6'
      }`}
    >
      {/* Navigation Links */}
      <div className="space-y-6">
        {!isCollapsed && (
          <div className="px-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Platform Navigation
            </span>
          </div>
        )}

        <nav className="space-y-1.5" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isNavLink = item.isRealRoute && item.path;

            if (isNavLink) {
              return (
                <NavLink
                  key={item.id}
                  to={item.path!}
                  end={item.id === 'dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative cursor-pointer ${
                      isActive
                        ? 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/80 shadow-xs dark:shadow-md dark:shadow-cyan-950/40 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.id === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />}
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleItemClick(item, e)}
                title={isCollapsed ? `${item.label} (Phase 2)` : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative text-left cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Research Engine Info & Logout */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
        {!isCollapsed && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-slate-800/90 text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-1 font-semibold">
              <span>Pipeline Architecture</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
              Multi-LLM Chaining Engine for Java Unit Test Synthesis
            </p>
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
