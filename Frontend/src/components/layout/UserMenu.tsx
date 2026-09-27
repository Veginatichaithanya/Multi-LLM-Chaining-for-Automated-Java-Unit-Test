import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Settings, LogOut, ChevronDown, Shield } from 'lucide-react';

interface UserMenuProps {
  onOpenPlaceholder: (featureTitle: string, featureDesc: string) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenPlaceholder }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  // Compute initials for the avatar badge (e.g., "Demo User" -> "DU")
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        id="user-menu-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-[#0b101c] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
      >
        {/* User Avatar Initials */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center shadow-sm">
          {initials}
        </div>

        {/* User Info (Hidden on tiny mobile) */}
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-white leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] font-mono text-slate-400 leading-tight">
            {user.role || 'Developer'}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b101c] border border-slate-700/80 shadow-2xl shadow-cyan-950/40 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Menu Header with User Identity */}
          <div className="px-3 py-2.5 border-b border-slate-800 mb-1">
            <p className="text-xs font-bold text-white leading-snug">{user.name}</p>
            <p className="text-[11px] font-mono text-cyan-400 truncate">{user.email}</p>
            <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Mock Dev Session</span>
            </div>
          </div>

          {/* Profile Item (Placeholder) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onOpenPlaceholder('User Profile', 'Profile management and API access keys will be available in Phase 2.');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span>Profile</span>
          </button>

          {/* Settings Item (Placeholder) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onOpenPlaceholder('Workspace Settings', 'LLM model temperature, JaCoCo thresholds, and sandbox configuration will be available in Phase 2.');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          {/* Logout Button */}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};
