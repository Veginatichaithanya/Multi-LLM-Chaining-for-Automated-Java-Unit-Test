import React, { useState } from 'react';
import {
  FileCode2,
  Sparkles,
  Terminal,
  Activity,
  ArrowRight,
  Copy,
  Check,
  Layers,
} from 'lucide-react';

interface PipelineStage {
  id: string;
  step: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  description: string;
  fileName: string;
  fileType: 'java' | 'terminal' | 'metrics';
  status: string;
  statusColor: string;
  codeSnippet: string;
  metrics: { label: string; value: string; hint?: string }[];
  technicalFlow: {
    input: string;
    action: string;
    output: string;
  };
}

export const HowItWorks: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const stages: PipelineStage[] = [
    {
      id: 'analyze',
      step: '01',
      title: 'Static AST Analysis',
      badge: 'Code Contract Parsing',
      badgeColor: 'border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
      icon: FileCode2,
      tagline: 'Deep AST Parsing & Control Flow Graph Extraction',
      description:
        'TestForge AI parses raw Java bytecode and source syntax using javalang AST traversal. It extracts public method signatures, input parameter types, declared exception boundaries, and cyclomatic complexity to ground LLM prompts in concrete syntax.',
      fileName: 'PaymentService.java',
      fileType: 'java',
      status: 'AST PARSED • 3 METHODS EXTRACTED',
      statusColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      codeSnippet: `package com.testforge.services;

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
      metrics: [
        { label: 'AST Nodes', value: '48 Parsed', hint: 'Classes, methods, fields' },
        { label: 'Cyclomatic Complexity', value: 'v(G) = 4', hint: '3 decision branches' },
        { label: 'Type Safety', value: '100% Grounded', hint: 'Zero hallucinated types' },
      ],
      technicalFlow: {
        input: 'Raw Java Class (.java)',
        action: 'Abstract Syntax Tree (AST) & Lexical Analysis',
        output: 'Structured JSON Method & Type Schema',
      },
    },
    {
      id: 'generate',
      step: '02',
      title: 'Targeted Test Synthesis',
      badge: 'Multi-LLM Drafting',
      badgeColor: 'border-cyan-200 dark:border-cyan-800/80 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300',
      icon: Sparkles,
      tagline: 'Targeted JUnit 5 & Mockito Synthesis',
      description:
        'The structured AST schema is paired with specialized prompt templates. A high-throughput model (such as Google Gemini) drafts comprehensive JUnit 5 Jupiter tests, complete with Mockito mock declarations and boundary assertions.',
      fileName: 'PaymentServiceTest.java',
      fileType: 'java',
      status: 'SYNTHESIZED • 5 JUNIT 5 TESTS',
      statusColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
      codeSnippet: `package com.testforge.services;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock private PaymentGateway gateway;
    @Mock private FraudDetector fraudDetector;
    @InjectMocks private PaymentService service;

    @Test
    @DisplayName("Should throw IllegalArgumentException when amount is zero or negative")
    void testProcessPayment_InvalidAmount() {
        PaymentRequest req = new PaymentRequest("ACC-1", BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class, () -> service.processPayment(req));
    }
}`,
      metrics: [
        { label: 'Synthesized Tests', value: '5 Scenarios', hint: 'Happy path + edge cases' },
        { label: 'Framework Target', value: 'JUnit 5 Jupiter', hint: 'Modern assertions' },
        { label: 'Inference Speed', value: '1.42s', hint: 'High-throughput generation' },
      ],
      technicalFlow: {
        input: 'AST Schema + Prompt Template',
        action: 'Generative Synthesis with Mock Specifications',
        output: 'Candidate JUnit 5 Test Class',
      },
    },
    {
      id: 'validate',
      step: '03',
      title: 'Sandboxed Maven Execution',
      badge: 'Headless JVM Sandbox',
      badgeColor: 'border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300',
      icon: Terminal,
      tagline: 'Real Compilation & Runtime Assertion Gate',
      description:
        'Candidate tests are isolated in ephemeral directories and executed against headless Apache Maven and Surefire. JaCoCo instruments bytecode to measure real line and branch coverage; raw javac errors and failed assertions are captured.',
      fileName: 'surefire-build.log',
      fileType: 'terminal',
      status: 'SUREFIRE PASS • 5 PASSED • 0 FAILED',
      statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      codeSnippet: `[INFO] Scanning for projects...
[INFO] ----------------< com.testforge:sandbox-eval >----------------
[INFO] Building TestForge Sandboxed Execution Pipeline 1.0.0
[INFO] --- maven-compiler-plugin:3.11.0:testCompile (default-testCompile) ---
[INFO] Compiling 1 source file to /tmp/testforge-sandbox/target/test-classes
[INFO] --- maven-surefire-plugin:3.2.5:test (default-test) ---
[INFO] Running com.testforge.services.PaymentServiceTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.182 s
[INFO] 
[INFO] --- jacoco-maven-plugin:0.8.12:report (report) ---
[INFO] Analyzed bundle 'sandbox-eval' with 1 class
[INFO] Results:
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS`,
      metrics: [
        { label: 'Compilation Status', value: '100% Success', hint: 'Zero syntax errors' },
        { label: 'Execution Time', value: '182 ms', hint: 'Ephemeral headless JVM' },
        { label: 'Surefire Results', value: '5 Passed / 0 Failed', hint: 'Zero regressions' },
      ],
      technicalFlow: {
        input: 'Test Class + Source Class',
        action: 'Headless Maven Surefire Execution',
        output: 'Surefire XML + JaCoCo Coverage Execution Map',
      },
    },
    {
      id: 'refine',
      step: '04',
      title: 'Closed-Loop Mutation Refinement',
      badge: 'Fault Healing & PIT Analysis',
      badgeColor: 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
      icon: Activity,
      tagline: 'Autonomous Error Healing & PIT Mutant Killing',
      description:
        'JaCoCo branch gaps and PIT surviving mutation signatures are fed into a specialized reasoning model (GPT-4o / Claude). The refinement agent surgically augments test assertions until boundary mutants are eliminated and coverage reaches 80%+.',
      fileName: 'pitest-mutation-report.xml',
      fileType: 'metrics',
      status: 'PIT VERIFIED • 81.0% MUTATION SCORE',
      statusColor: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
      codeSnippet: `>> PIT (Pitest) Mutation Engine v1.15.8 Analysis
================================================================================
Target Class: com.testforge.services.PaymentService
Active Mutators: ConditionalsBoundary, Math, InvertConditionals, ReturnValues

>> MUTATION TEST RESULTS:
- Line 14: Substituted (<= 0) with (< 0)        -> KILLED by testProcessPayment_InvalidAmount
- Line 14: Substituted (<= 0) with (<= 1)        -> KILLED by testProcessPayment_InvalidAmount
- Line 17: Inverted condition (isFlagged)       -> KILLED by testProcessPayment_FlaggedAccount
- Line 20: Replaced return value with NULL      -> KILLED by testProcessPayment_Success

================================================================================
>> SUMMARY METRICS:
>> Line Coverage     : 84.3% (+21.9% vs single-LLM draft)
>> Branch Coverage   : 76.5% (+22.4% vs single-LLM draft)
>> Mutation Score    : 81.0% (97 of 120 mutants KILLED)
>> Defect Escapes    : 23 surviving (reduced from 50)
================================================================================`,
      metrics: [
        { label: 'Line Coverage', value: '84.3%', hint: '+21.9% improvement' },
        { label: 'Branch Coverage', value: '76.5%', hint: '+22.4% improvement' },
        { label: 'PIT Mutation Score', value: '81.0%', hint: '97 / 120 mutants killed' },
      ],
      technicalFlow: {
        input: 'Compiler Errors + Surviving Mutants',
        action: 'Multi-Agent Closed-Loop Code Refinement',
        output: 'Production-Ready Verified Test Suite',
      },
    },
  ];

  const currentStage = stages[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentStage.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNextStage = () => {
    setActiveTab((prev) => (prev + 1) % stages.length);
  };

  return (
    <section
      className="py-20 sm:py-28 px-4 relative bg-slate-50 dark:bg-[#070a11] border-t border-slate-200 dark:border-slate-850 overflow-hidden transition-colors"
      id="how-it-works"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/90 dark:border-cyan-800/80 text-xs font-mono text-cyan-800 dark:text-cyan-300 mb-4 font-semibold shadow-xs">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>PIPELINE ARCHITECTURE</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            From Java Source to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-300">
              Verified Production Tests
            </span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            A deterministic 4-stage pipeline combining static AST analysis, LLM test synthesis, isolated JVM execution, and closed-loop mutation refinement.
          </p>
        </div>

        {/* 4 Interactive Stage Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-8">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isActive
                    ? 'bg-white dark:bg-[#0c121e] border-cyan-500 dark:border-cyan-400 shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/20'
                    : 'bg-white/80 dark:bg-[#090d16]/80 border-slate-200/90 dark:border-slate-800/80 hover:bg-white dark:hover:bg-[#0d1320] hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    STAGE {stage.step}
                  </span>
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold truncate transition-colors ${
                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {stage.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {stage.badge}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Master Showcase: Interactive Terminal / IDE Console */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0a0f19] shadow-xl dark:shadow-2xl overflow-hidden transition-colors">
          {/* Top Window Chrome */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-100/90 dark:bg-[#0d1320] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Window Dots & File Name Tab */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 shadow-2xs">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{currentStage.fileName}</span>
              </div>
            </div>

            {/* Right: Live Execution Status & Action Buttons */}
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border ${currentStage.statusColor}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{currentStage.status}</span>
              </span>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="Copy Code"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Console Body: Code Editor View + Side Context Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Code / Terminal View (Left 7 Cols) */}
            <div className="lg:col-span-7 bg-slate-950 p-4 sm:p-6 overflow-x-auto text-slate-100 font-mono text-xs sm:text-[13px] leading-relaxed max-h-[460px] border-b lg:border-b-0 lg:border-r border-slate-800">
              <pre className="selection:bg-cyan-500/30">
                <code>{currentStage.codeSnippet}</code>
              </pre>
            </div>

            {/* Stage Context & Telemetry Breakdown (Right 5 Cols) */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-50/50 dark:bg-[#0a0f19] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-block text-[11px] font-mono px-2.5 py-0.5 rounded border font-semibold ${currentStage.badgeColor}`}
                  >
                    {currentStage.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                    PHASE {currentStage.step} OF 04
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {currentStage.tagline}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  {currentStage.description}
                </p>

                {/* Technical Input/Action/Output Flow */}
                <div className="space-y-2 p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 mb-6 shadow-xs">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold mb-1">
                    EXECUTION CONTRACT
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Input:</span>
                    <span className="truncate">{currentStage.technicalFlow.input}</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Action:</span>
                    <span>{currentStage.technicalFlow.action}</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Result:</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">{currentStage.technicalFlow.output}</span>
                  </div>
                </div>

                {/* 3 Real Telemetry Metric Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {currentStage.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center shadow-xs"
                    >
                      <div className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        {metric.value}
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Navigation CTA */}
              <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs font-mono text-slate-500">
                  Step {activeTab + 1} of 4
                </div>
                <button
                  type="button"
                  onClick={handleNextStage}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
                >
                  <span>Next Phase</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              onClick={() => setActiveTab(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeTab === idx
                  ? 'bg-white dark:bg-slate-900 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/20'
                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-slate-500">
                <span className="text-cyan-600 dark:text-cyan-400">0{idx + 1}.</span>
                <span>{stage.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
