import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  Terminal,
  ShieldCheck,
  FileCode2,
  Activity,
  Copy,
  Check,
} from 'lucide-react';
import WebThreads from '../ui/WebThreads';
import { useTheme } from '../../context/ThemeContext';

interface HeroProps {
  onStartClick: () => void;
  onSeeHowItWorksClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartClick, onSeeHowItWorksClick }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'source' | 'tests' | 'execution' | 'pit'>('tests');
  const [copied, setCopied] = useState<boolean>(false);

  const heroTabs = {
    source: {
      name: 'PaymentService.java',
      badge: 'INPUT CLASS',
      badgeColor: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      status: 'AST PARSED • 3 BRANCH TARGETS',
      statusColor: 'text-blue-600 dark:text-blue-400',
      code: `package com.testforge.services;

import com.testforge.models.*;
import java.math.BigDecimal;

public class PaymentService {
    private final PaymentGateway gateway;
    private final FraudDetector fraudDetector;

    public PaymentReceipt processPayment(PaymentRequest req) {
        if (req == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }
        if (fraudDetector.isFlagged(req.getAccountId())) {
            return PaymentReceipt.flagged("Account flagged for risk verification");
        }
        return gateway.executeTransaction(req.getId(), req.getAmount());
    }
}`,
    },
    tests: {
      name: 'PaymentServiceTest.java',
      badge: 'SYNTHESIZED SUITE',
      badgeColor: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
      status: 'JUNIT 5 + MOCKITO • 6 TESTS',
      statusColor: 'text-cyan-600 dark:text-cyan-400',
      code: `package com.testforge.services;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock private PaymentGateway gateway;
    @Mock private FraudDetector fraudDetector;
    @InjectMocks private PaymentService paymentService;

    @Test
    @DisplayName("Should throw IllegalArgumentException when amount is zero or negative")
    void testProcessPayment_InvalidAmount() {
        PaymentRequest req = new PaymentRequest("ACC-1", BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class, () -> paymentService.processPayment(req));
    }

    @Test
    @DisplayName("Should return flagged receipt when account is flagged for fraud")
    void testProcessPayment_FraudFlagged() {
        PaymentRequest req = new PaymentRequest("ACC-99", new BigDecimal("100.00"));
        when(fraudDetector.isFlagged("ACC-99")).thenReturn(true);

        PaymentReceipt receipt = paymentService.processPayment(req);
        assertTrue(receipt.isFlagged());
        verify(gateway, never()).executeTransaction(any(), any());
    }
}`,
    },
    execution: {
      name: 'surefire-build.log',
      badge: 'HEADLESS JVM',
      badgeColor: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      status: 'BUILD SUCCESS • 6 PASSED',
      statusColor: 'text-emerald-600 dark:text-emerald-400',
      code: `[INFO] --- maven-surefire-plugin:3.2.5:test (default-test) ---
[INFO] Running com.testforge.services.PaymentServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.194 s
[INFO] 
[INFO] --- jacoco-maven-plugin:0.8.12:report (report) ---
[INFO] Loading execution data from /tmp/sandbox-run/jacoco.exec
[INFO] Analyzed bundle 'PaymentService' with 1 class
[INFO] -------------------------------------------------------------
[INFO] JaCoCo Line Coverage        : 84.3% (+21.9% vs baseline)
[INFO] JaCoCo Branch Coverage      : 76.5% (+22.4% vs baseline)
[INFO] -------------------------------------------------------------
[INFO] BUILD SUCCESS`,
    },
    pit: {
      name: 'pitest-mutations.xml',
      badge: 'MUTATION RESILIENCE',
      badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      status: '81.0% MUTATION SCORE • 97/120 KILLED',
      statusColor: 'text-teal-600 dark:text-teal-400',
      code: `>> PIT (Pitest) Mutation Engine v1.15.8 Analysis Report
================================================================================
Target Class: com.testforge.services.PaymentService
Mutators Activated: ConditionalsBoundary, Math, InvertConditionals, ReturnValues

>> MUTATION VERIFICATION LOG:
- Line 11: Changed conditional boundary (<= 0) to (< 0)   -> KILLED by testProcessPayment_InvalidAmount
- Line 14: Inverted conditional (isFlagged == true)      -> KILLED by testProcessPayment_FraudFlagged
- Line 17: Mutated return value to NULL                 -> KILLED by testProcessPayment_Success

================================================================================
>> SUMMARY: Total Mutants: 120 | Killed: 97 | Surviving: 23
>> FINAL MUTATION SCORE: 81.0% (Defect escapes reduced by 54%)
================================================================================`,
    },
  };

  const currentTab = heroTabs[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTab.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 overflow-hidden" id="hero">
      {/* Background Ambient Visual Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-30 z-0 overflow-hidden">
        <WebThreads
          color1={isDark ? "#06b6d4" : "#0284c7"}
          color2={isDark ? "#6366f1" : "#4f46e5"}
          color3={isDark ? "#ffffff" : "#0ea5e9"}
          speed={0.12}
          threadCount={5}
          frequency={3.5}
          spread={0.2}
          taper={0.9}
          position={0.35}
          fanMode="center"
          glow={0.015}
          falloff={0.65}
          thickness={0.8}
          brightness={0.4}
          opacity={isDark ? 0.5 : 0.25}
          mirror={true}
          shimmer={false}
          grain={true}
          grainIntensity={0.03}
          mouseInteraction={true}
          mouseStrength={0.2}
          lightMode={!isDark}
        />
      </div>

      {/* Subtle Radial Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[550px] pointer-events-none z-0 dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(6,182,212,0.18),rgba(99,102,241,0.08),transparent)] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(2,132,199,0.12),rgba(79,70,229,0.06),transparent)]" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Main Heading */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight dark:text-white text-slate-900 max-w-4xl mx-auto leading-[1.12]">
          Generate{' '}
          <span className="text-transparent bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 drop-shadow-[0_0_24px_rgba(6,182,212,0.25)]">
            Better Java Unit Tests
          </span>
          .<br />
          Automatically.
        </h1>

        {/* Supporting Subheadline */}
        <p className="mt-6 text-base sm:text-lg md:text-xl dark:text-slate-300 text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          An execution-guided multi-LLM chaining platform that analyzes Java AST, executes tests in isolated headless JVM sandboxes, and eliminates bugs with PIT mutation testing.
        </p>

        {/* High-Contrast Action CTAs */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
          <button
            type="button"
            onClick={onStartClick}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold text-sm active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            id="hero-primary-cta"
          >
            <span>Start Generating Tests</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={onSeeHowItWorksClick}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 font-semibold text-sm transition-all duration-200 shadow-xs hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            id="hero-secondary-cta"
          >
            <Play className="w-3.5 h-3.5 fill-current text-cyan-600 dark:text-cyan-400 transition-transform duration-200 group-hover:scale-110" />
            <span>See How It Works</span>
          </button>
        </div>

        {/* Developer Proof Micro-tags */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-mono dark:text-slate-400 text-slate-600">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md dark:bg-slate-900/70 bg-white border border-slate-200 dark:border-slate-800 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero Hallucinations</span>
          </div>
          <span className="hidden sm:inline dark:text-slate-700 text-slate-300">•</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md dark:bg-slate-900/70 bg-white border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Terminal className="w-3.5 h-3.5 text-cyan-500" />
            <span>Headless Maven Sandbox</span>
          </div>
          <span className="hidden sm:inline dark:text-slate-700 text-slate-300">•</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md dark:bg-slate-900/70 bg-white border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-purple-500" />
            <span>PIT Mutation Verified</span>
          </div>
        </div>

        {/* Hero Interactive Code & Telemetry Showcase */}
        <div className="mt-12 text-left rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#0a0f1a] shadow-xl dark:shadow-2xl overflow-hidden transition-all duration-300">
          {/* Top Window Navigation & Switcher */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-100/90 dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Window Controls & File Tab */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 shadow-2xs">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{currentTab.name}</span>
              </div>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-850 border border-slate-300/60 dark:border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  activeTab === 'source'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                1. Source Class
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tests')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  activeTab === 'tests'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                2. AI Synthesized Tests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('execution')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  activeTab === 'execution'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                3. Maven & JaCoCo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pit')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer hidden sm:block ${
                  activeTab === 'pit'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                4. PIT Mutation
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Copy Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="bg-slate-950 p-4 sm:p-6 overflow-x-auto text-slate-100 font-mono text-xs sm:text-[13px] leading-relaxed max-h-[380px]">
            <pre className="selection:bg-cyan-500/30">
              <code>{currentTab.code}</code>
            </pre>
          </div>

          {/* Telemetry Footer Bar */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-[#0d1322] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 font-bold ${currentTab.statusColor}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>{currentTab.status}</span>
              </span>
              <span className="text-slate-400 hidden md:inline">|</span>
              <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
                JDK 17 • Apache Maven 3.9 • PIT 1.15.8
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                84.3% Line Coverage
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-semibold text-[11px]">
                81.0% Mutation Score
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
