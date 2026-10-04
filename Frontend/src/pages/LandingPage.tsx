import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PillNav } from '../components/navigation/PillNav';
import { Hero } from '../components/landing/Hero';
import { TechStrip } from '../components/landing/TechStrip';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Features } from '../components/landing/Features';
import { ResearchSection } from '../components/landing/ResearchSection';
import { RefinementLoop } from '../components/landing/RefinementLoop';
import { AboutSection } from '../components/landing/AboutSection';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-cyan-500/25 selection:text-cyan-200 transition-colors">
      {/* Top Floating Pill Navigation */}
      <PillNav onGetStartedClick={handleNavigateToLogin} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* 1. Hero Section with WebThreads & Pipeline Visualization */}
        <Hero
          onStartClick={handleNavigateToLogin}
          onSeeHowItWorksClick={handleScrollToHowItWorks}
        />

        {/* 2. Built Around Technical Strip */}
        <TechStrip />

        {/* 3. 4-Stage How It Works Pipeline */}
        <HowItWorks />

        {/* 4. Core Features & Validation Stages */}
        <Features />

        {/* 5. Closed-Loop Multi-LLM Refinement Engine */}
        <RefinementLoop />

        {/* 6. Research Benchmark Matrix (No Fake Stats) */}
        <ResearchSection />

        {/* 7. Research Background & Academic Pillars */}
        <AboutSection />

        {/* 8. Final Call to Action */}
        <FinalCTA onGetStartedClick={handleNavigateToLogin} />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
