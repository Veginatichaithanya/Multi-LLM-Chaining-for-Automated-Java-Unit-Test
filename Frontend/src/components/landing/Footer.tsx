import React from 'react';
import { Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  const links = [
    { name: 'Home', href: '#' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Features', href: '#features' },
    { name: 'Research', href: '#research' },
    { name: 'About', href: '#about' },
  ];

  const handleScroll = (href: string) => {
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-[#05070c] border-t border-slate-800/80 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        {/* Brand Information */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">TestForge AI</span>
          </div>
          <p className="text-xs text-slate-400">
            Multi-LLM Java Unit Test Generation &amp; Refinement
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400" aria-label="Footer Navigation">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleScroll(link.href);
              }}
              className="hover:text-cyan-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded px-1"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Footnote */}
        <div className="text-xs font-mono text-slate-400">
          <span>Automated Java Testing Research Platform</span>
        </div>
      </div>
    </footer>
  );
};
