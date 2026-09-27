import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Bell, Menu, PanelLeftClose, PanelLeft, CheckCircle2 } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from '../ui/ThemeToggle';


interface AppHeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
  onOpenPlaceholder: (featureTitle: string, featureDesc: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
  onOpenPlaceholder,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#07090e]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: Navigation toggles & Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open mobile navigation drawer"
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Button */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Brand Logo & Name */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm font-bold text-white group focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-lg p-1"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-sm">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-tight">
            TestForge{' '}
            <span className="text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
              AI
            </span>
          </span>
        </Link>

        {/* Workspace Context Tag (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-400">
            Automated Java Test Generation Workspace
          </span>
        </div>
      </div>

      {/* Right side: Notifications & User */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            type="button"
            id="notifications-button"
            aria-label="View notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#07090e]" />
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0b101c] border border-slate-700/80 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
              onMouseLeave={() => setShowNotifications(false)}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">Notifications</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                  1 New
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    TestForge Workspace Ready
                  </p>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    Pipeline chaining architecture initialized for Java test generation.
                  </p>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    Just now
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher (Light / Dark Mode) */}
        <ThemeToggle />

        {/* User Menu */}
        <UserMenu onOpenPlaceholder={onOpenPlaceholder} />
      </div>
    </header>
  );
};
