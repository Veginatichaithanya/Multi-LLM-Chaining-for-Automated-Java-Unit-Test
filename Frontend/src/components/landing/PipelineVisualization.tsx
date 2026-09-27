import React, { useState, useEffect } from 'react';
import { 
  FileCode2, 
  Sparkles, 
  PlayCircle, 
  Activity, 
  GitMerge, 
  CheckCircle2, 
  Terminal, 
  Layers, 
  ChevronRight 
} from 'lucide-react';

interface StageInfo {
  id: string;
  step: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  tagColor: string;
  iconColor: string;
  detail: string;
  codeSnippet: string;
}

const pipelineStages: StageInfo[] = [
  {
    id: 'source',
    step: '01',
    label: 'Java Source',
    sublabel: 'AST Parsing & Method Extraction',
    icon: FileCode2,
    tag: 'INPUT',
    tagColor: 'dark:text-blue-400 dark:bg-blue-950/60 dark:border-blue-800/60 bg-blue-50 text-blue-700 border-blue-200 font-semibold',
    iconColor: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60',
    detail: 'Parses PaymentService.java, extracts class signature, method parameters, and branching conditions.',
    codeSnippet: `public class PaymentService {
    public PaymentReceipt process(PaymentRequest req) {
        if (req.getAmount() <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }

        if (req.isFraudFlagged()) {
            return PaymentReceipt.rejected("Security check triggered");
        }

        return gateway.charge(req);
    }
}`
  },
  {
    id: 'gemini',
    step: '02',
    label: 'Gemini 1.5 Pro',
    sublabel: 'Initial Unit Test Generation',
    icon: Sparkles,
    tag: 'LLM 1',
    tagColor: 'dark:text-cyan-400 dark:bg-cyan-950/60 dark:border-cyan-800/60 bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold',
    iconColor: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/60',
    detail: 'Synthesizes foundational JUnit 5 test cases covering standard happy paths and basic validation.',
    codeSnippet: `@Test
@DisplayName("Should reject payment when amount is zero or negative")
void testProcess_InvalidAmount() {
    PaymentRequest req = new PaymentRequest(-10.0);
    assertThrows(IllegalArgumentException.class, () -> {
        paymentService.process(req);
    });
}`
  },
  {
    id: 'execution',
    step: '03',
    label: 'JUnit 5 Execution',
    sublabel: 'Compile & Runtime Verification',
    icon: PlayCircle,
    tag: 'TEST RUNNER',
    tagColor: 'dark:text-amber-400 dark:bg-amber-950/60 dark:border-amber-800/60 bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    iconColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    detail: 'Executes generated tests in an isolated sandbox. Validates mock dependencies and assertion results.',
    codeSnippet: `[INFO] --- maven-surefire-plugin:3.2.5:test ---
[INFO] Running com.forge.PaymentServiceTest
[INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0
[ERROR] testProcess_FraudFlag: expected REJECTED but was NULL (missing mock)
[ERROR] at com.forge.PaymentServiceTest.testProcess_FraudFlag(Line 42)`
  },
  {
    id: 'jacoco',
    step: '04',
    label: 'JaCoCo Measurement',
    sublabel: 'Bytecode Coverage Profiling',
    icon: Activity,
    tag: 'METRICS',
    tagColor: 'dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800/60 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    iconColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
    detail: 'Analyzes bytecodes to map missed branches and uncover unexecuted error pathways.',
    codeSnippet: `[JACOCO COVERAGE ANALYSIS]
Instruction Coverage : 78.4%
Branch Coverage      : 66.7% (2 of 6 branches missed)
Uncovered Targets    : 
  -> Line 8: Branch 'isFraudFlagged() == true'
  -> Line 12: Network timeout fallback`
  },
  {
    id: 'openai',
    step: '05',
    label: 'OpenAI Refinement',
    sublabel: 'Coverage-Gap Guided Prompting',
    icon: GitMerge,
    tag: 'LLM 2',
    tagColor: 'dark:text-purple-400 dark:bg-purple-950/60 dark:border-purple-800/60 bg-purple-50 text-purple-700 border-purple-200 font-semibold',
    iconColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60',
    detail: 'Ingests compiler diagnostic + JaCoCo coverage gap report to craft targeted edge-case unit tests.',
    codeSnippet: `// LLM 2 Refinement Prompt Context:
// Missing branch: isFraudFlagged() == true
// Fixing mock setup for Gateway response
@Test
@DisplayName("Should return rejected receipt when fraud flag is detected")
void testProcess_FraudFlagged() {
    PaymentRequest req = new PaymentRequest(250.0, true);
    PaymentReceipt res = paymentService.process(req);
    assertTrue(res.isRejected());
}`
  },
  {
    id: 'refined',
    step: '06',
    label: 'Refined Test Suite',
    sublabel: 'Validated JUnit 5 Suite',
    icon: CheckCircle2,
    tag: 'VERIFIED',
    tagColor: 'dark:text-teal-400 dark:bg-teal-950/60 dark:border-teal-800/60 bg-teal-50 text-teal-700 border-teal-200 font-semibold',
    iconColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    detail: 'Final suite with full compilation pass, zero hallucinated methods, and complete branch validation.',
    codeSnippet: `[BUILD SUCCESS]
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] JaCoCo Branch Coverage: 100% of tested target pathways
[INFO] Clean JUnit 5 test suite saved to src/test/java/
[INFO] All 6 test methods compiled & executed successfully.`
  }
];

// Lightweight syntax highlighting renderer for Java code and build logs
const renderLineTokens = (line: string): React.ReactNode => {
  if (!line || line.trim().length === 0) {
    return '\u00A0'; // non-breaking space for blank lines so row height remains uniform
  }

  if (line.trim().startsWith('//')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  if (line.includes('[ERROR]')) {
    const parts = line.split('[ERROR]');
    return (
      <>
        {parts[0]}
        <span className="text-rose-400 font-bold">[ERROR]</span>
        <span className="text-rose-300/90">{parts.slice(1).join('[ERROR]')}</span>
      </>
    );
  }

  if (line.includes('[INFO]')) {
    const parts = line.split('[INFO]');
    return (
      <>
        {parts[0]}
        <span className="text-cyan-400 font-semibold">[INFO]</span>
        <span className="text-slate-300">{parts.slice(1).join('[INFO]')}</span>
      </>
    );
  }

  if (line.includes('[BUILD SUCCESS]')) {
    return <span className="text-emerald-400 font-bold">{line}</span>;
  }

  if (line.includes('[JACOCO')) {
    return <span className="text-emerald-400 font-semibold">{line}</span>;
  }

  // Tokenize Java code: strings, annotations, keywords, types, methods, and symbols
  const tokenRegex = /("(?:\\.|[^"\\])*")|(@\w+)|(\b(?:public|class|if|throw|new|return|void|boolean|int|double)\b)|(\b(?:PaymentService|PaymentReceipt|PaymentRequest|IllegalArgumentException|String)\b)|(\b(?:assertThrows|assertTrue|assertEquals|rejected|charge|getAmount|isFraudFlagged|process)\b)|([^\s"'@\w]+|\s+|\w+)/g;

  const elements: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const [full, str, annot, kw, type, fn] = match;
    if (str) {
      elements.push(<span key={idx++} className="text-emerald-400">{str}</span>);
    } else if (annot) {
      elements.push(<span key={idx++} className="text-amber-400 font-medium">{annot}</span>);
    } else if (kw) {
      elements.push(<span key={idx++} className="text-purple-400 font-medium">{kw}</span>);
    } else if (type) {
      elements.push(<span key={idx++} className="text-cyan-300">{type}</span>);
    } else if (fn) {
      elements.push(<span key={idx++} className="text-teal-300">{fn}</span>);
    } else {
      elements.push(<span key={idx++} className="text-slate-200">{full}</span>);
    }
  }

  return elements.length > 0 ? elements : line;
};

export const PipelineVisualization: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % pipelineStages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const currentStage = pipelineStages[activeStageIndex];
  const codeLines = currentStage.codeSnippet.split('\n');

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 rounded-2xl bg-white dark:bg-[#090d16]/95 border border-slate-200 dark:border-slate-800/90 shadow-2xl shadow-slate-200/60 dark:shadow-cyan-950/30 overflow-hidden text-left">
      {/* Top IDE Window Header */}
      <div className="px-4 py-3 bg-slate-100/90 dark:bg-[#0c121e] border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-mono font-medium">
            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-bold">testforge-pipeline</span>
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <span className="text-slate-600 dark:text-slate-400">PaymentService.java</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
            ACTIVE STAGE {activeStageIndex + 1}/{pipelineStages.length}
          </span>
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className="px-2.5 py-0.5 text-[11px] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900/60 transition-colors shadow-xs"
          >
            {autoPlay ? 'Pause Flow' : 'Auto Flow'}
          </button>
        </div>
      </div>

      {/* Main Pipeline Interface Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Interactive Stages Node Tree */}
        <div className="lg:col-span-5 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#080c14]/60">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-3 flex items-center justify-between">
            <span>Multi-LLM Chaining Stages</span>
            <span className="text-slate-500 dark:text-slate-400">Click stage to inspect</span>
          </div>

          <div className="space-y-2 relative">
            {/* Visual connector line behind nodes */}
            <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-blue-500/40 via-cyan-500/40 to-teal-500/40 pointer-events-none" />

            {pipelineStages.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = idx === activeStageIndex;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    setActiveStageIndex(idx);
                    setAutoPlay(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-3 relative z-10 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/30 translate-x-1'
                      : 'bg-white/80 dark:bg-[#0c121e]/70 border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/60 shadow-xs'
                  }`}
                >
                  {/* Step Number & Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold transition-colors border ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/50'
                        : stage.iconColor
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {stage.label}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${stage.tagColor}`}>
                        {stage.tag}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isSelected ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {stage.sublabel}
                    </p>
                  </div>

                  {isSelected && (
                    <ChevronRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code & Stage Inspection Terminal */}
        <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between bg-[#060910] text-left">
          <div>
            {/* Stage Title and Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">STAGE {currentStage.step}</span>
                  <span className="text-slate-600">•</span>
                  <h3 className="text-sm font-semibold text-white">{currentStage.label}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{currentStage.detail}</p>
              </div>
            </div>

            {/* Code / Execution Console View (IDE Style Editor) */}
            <div className="relative rounded-xl bg-[#03060a] border border-slate-800 font-mono text-xs overflow-hidden text-left shadow-inner">
              {/* Header */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-3.5 py-2.5 bg-[#080c14] border-b border-slate-800/80">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Live Snapshot
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Read-only buffer</span>
              </div>

              {/* Code Area with Fixed Left Line-Number Column and Left-Aligned Code Rows */}
              <div className="overflow-x-auto overflow-y-auto max-h-[320px] min-h-[260px] p-3 scrollbar-thin text-left bg-[#03060a]">
                <div className="min-w-full inline-block">
                  {codeLines.map((line, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-baseline hover:bg-slate-800/30 transition-colors leading-6 min-h-[1.5rem] font-mono text-left"
                    >
                      {/* Fixed Line-Number Column */}
                      <span className="w-8 pr-3 text-right select-none text-slate-600 text-[11px] shrink-0 border-r border-slate-800/80 mr-3">
                        {idx + 1}
                      </span>
                      {/* Code Content Column */}
                      <span className="text-xs text-slate-200 whitespace-pre text-left flex-1 font-mono">
                        {renderLineTokens(line)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Execution Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Compilation: OK</span>
              <span className="text-slate-700">|</span>
              <span>JaCoCo Profiler: ACTIVE</span>
            </div>
            <span className="text-slate-400 text-[10px]">Multi-LLM Chaining Protocol v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
