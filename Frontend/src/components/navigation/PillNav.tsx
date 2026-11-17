import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface PillNavProps {
  onGetStartedClick?: () => void;
}

const NAV_ITEMS = [
  { name: 'Home', href: '#' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Features', href: '#features' },
  { name: 'Research', href: '#research' },
  { name: 'About', href: '#about' },
];

export const PillNav: React.FC<PillNavProps> = ({ onGetStartedClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV_ITEMS;

  const [activeTab, setActiveTab] = useState('Home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);

          if (location.pathname === '/') {
            if (window.scrollY < 180) {
              setActiveTab('Home');
            } else {
              const sections = [
                { name: 'About', id: 'about' },
                { name: 'Research', id: 'research' },
                { name: 'Features', id: 'features' },
                { name: 'How It Works', id: 'how-it-works' },
              ];

              for (const section of sections) {
                const el = document.getElementById(section.id);
                if (el) {
                  const rect = el.getBoundingClientRect();
                  if (rect.top <= 140 && rect.bottom > 140) {
                    setActiveTab(section.name);
                    break;
                  }
                }
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (name: string, href: string) => {
    setActiveTab(name);
    setMobileMenuOpen(false);

    if (location.pathname !== '/') {
      navigate('/' + (href === '#' ? '' : href));
      return;
    }

    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const target = document.querySelector(href);
      if (target) {
        const navOffset = 72;
        const elementPosition = target.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - navOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleGetStarted = () => {
    setMobileMenuOpen(false);
    if (onGetStartedClick) {
      onGetStartedClick();
    } else {
      navigate('/login');
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 dark:bg-[#07090e]/95 border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md'
          : 'bg-white/80 dark:bg-[#07090e]/80 border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('Home', '#');
          }}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg select-none"
          aria-label="TestForge AI Home"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 flex items-center justify-center font-black text-xs shadow-xs transition-transform group-hover:scale-105">
            TF
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
              TestForge
            </span>
            <span className="text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800/80 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
              AI
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.name;
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.name, item.href);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 select-none ${
                  isActive
                    ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800/90 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={handleGetStarted}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 active:scale-[0.98] transition-all duration-200 shadow-xs cursor-pointer group"
            id="nav-get-started-btn"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            id="nav-mobile-toggle"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#07090e]/95 backdrop-blur-xl px-4 py-3 flex flex-col gap-1 shadow-lg animate-in fade-in duration-150"
          id="mobile-nav-menu"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.name;
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.name, item.href);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  isActive
                    ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{item.name}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
              </a>
            );
          })}

          <div className="pt-2.5 mt-1 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-center text-white dark:text-slate-950 bg-slate-900 dark:bg-cyan-500 hover:bg-slate-800 dark:hover:bg-cyan-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
