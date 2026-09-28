import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, ArrowRight, Menu, X } from 'lucide-react';
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      if (location.pathname !== '/') return;

      // Section scrollspy
      const sections = ['about', 'research', 'features', 'how-it-works'];
      const scrollPosition = window.scrollY + 150;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el && el.offsetTop <= scrollPosition) {
          const matchedItem = navItems.find((item) => item.href === `#${sectionId}`);
          if (matchedItem) {
            setActiveTab(matchedItem.name);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveTab('Home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, navItems]);


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
        target.scrollIntoView({ behavior: 'smooth' });
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
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-4 sm:py-5 transition-all duration-300">
      <div
        className={`w-full max-w-6xl flex items-center justify-between px-3 sm:px-5 py-2.5 rounded-full transition-all duration-300 ${
          scrolled
            ? 'dark:bg-[#0b0f17]/90 dark:border-slate-800/90 dark:shadow-2xl dark:shadow-cyan-950/20 bg-white/95 border border-slate-200 shadow-xl shadow-slate-200/50 backdrop-blur-md'
            : 'dark:bg-[#0d121c]/70 dark:border-slate-800/50 bg-white/80 border border-slate-200/80 backdrop-blur-sm shadow-sm'
        }`}
      >
        {/* Brand Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('Home', '#');
          }}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg pr-2"
          aria-label="TestForge AI Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-500 group-hover:border-cyan-400 transition-colors shadow-sm shadow-cyan-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight dark:text-white text-slate-900 flex items-center gap-1.5">
              TestForge <span className="dark:text-cyan-400 dark:bg-cyan-950/60 dark:border-cyan-800/60 text-cyan-800 bg-cyan-50 border border-cyan-200 font-mono text-xs px-1.5 py-0.5 rounded">AI</span>
            </span>
          </div>
        </a>

        {/* Desktop Navigation Pills */}
        <nav
          className="hidden md:flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-full dark:bg-slate-900/80 dark:border-slate-800/80 bg-slate-100/90 border border-slate-200/90 shadow-inner"
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
                className={`relative px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 select-none ${
                  isActive
                    ? 'dark:text-white dark:bg-slate-800 dark:border-slate-700/60 text-slate-950 bg-gradient-to-r from-white via-cyan-50/80 to-blue-50/80 shadow-sm border border-cyan-200/90 font-bold ring-1 ring-cyan-400/30'
                    : 'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 mr-1.5 animate-pulse align-middle shadow-xs shadow-cyan-500/50" />
                )}
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          <button
            type="button"
            onClick={handleGetStarted}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            id="nav-get-started-btn"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
          className="md:hidden fixed inset-x-4 top-20 p-4 rounded-2xl dark:bg-[#0b0f17]/95 dark:border-slate-800 bg-white/95 border border-slate-200 shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-xl"
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
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                  isActive
                    ? 'dark:text-cyan-400 dark:bg-cyan-950/40 dark:border-cyan-800/40 text-cyan-800 bg-cyan-50 border border-cyan-200 font-semibold'
                    : 'dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <span>{item.name}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-cyan-500" />}
              </a>
            );
          })}

          <div className="pt-2 mt-1 border-t dark:border-slate-800 border-slate-200">
            <button
              type="button"
              onClick={handleGetStarted}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
