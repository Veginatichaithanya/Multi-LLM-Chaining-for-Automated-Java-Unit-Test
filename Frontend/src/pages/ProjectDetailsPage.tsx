import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import { projectApi, type Project } from '../services/projectApi';
import { sourceApi, type SourceFile, type SourceFileWithCode } from '../services/sourceApi';
import { generationApi, type GenerationResult } from '../services/generationApi';
import { coverageApi, type TestExecutionResult, type CoverageResult } from '../services/coverageApi';
import { refinementApi, type RefinementRecordOut } from '../services/refinementApi';
import type { JavaAnalysisResult, Phase3AnalysisResponse } from '../services/types';
import { JavaCodeViewer } from '../components/source/JavaCodeViewer';
import {
  ArrowLeft,
  ArrowRight,
  FileCode2,
  Upload,
  Play,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  Percent,
  RefreshCw,
  Loader2,
  Activity,
  FlaskConical,
  Download,
  ChevronDown,
  ChevronRight,
  Code2,
  Plus,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type TabType =
  | 'source'
  | 'analysis'
  | 'generation'
  | 'execution'
  | 'coverage'
  | 'refinement'
  | 'experiment'
  | 'activity';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per Phase 3 spec

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState<TabType>('source');

  // Source files state
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceFileWithCode | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadSourceCode, setUploadSourceCode] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SourceFile | null>(null);
  const [isDeletingSource, setIsDeletingSource] = useState(false);
  const [analysisDetailsExpanded, setAnalysisDetailsExpanded] = useState(false);

  // Analysis state (Phase 3 structured analysis)
  const [analysisResult, setAnalysisResult] = useState<JavaAnalysisResult | null>(null);
  const [phase3Analysis, setPhase3Analysis] = useState<Phase3AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({ 0: true });
  const [showRawAnalysis, setShowRawAnalysis] = useState(false);
  const [copiedRawJson, setCopiedRawJson] = useState(false);

  // Generation state (Phase 2)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openrouter' | 'agentrouter'>('gemini');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationsHistory, setGenerationsHistory] = useState<GenerationResult[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Execution state (Phase 4)
  const [executionResult, setExecutionResult] = useState<TestExecutionResult | null>(null);
  const [executionHistory, setExecutionHistory] = useState<TestExecutionResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<'summary' | 'console' | 'failures'>('summary');
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);

  // Coverage state (Phase 4)
  const [coverageResult, setCoverageResult] = useState<CoverageResult | null>(null);
  const [isMeasuringCoverage, setIsMeasuringCoverage] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  // Refinement state (Phase 5)
  const [refinementHistory, setRefinementHistory] = useState<RefinementRecordOut[]>([]);
  const [maxIterations, setMaxIterations] = useState<number>(3);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementStatusText, setRefinementStatusText] = useState<string>('');
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [selectedCodeIteration, setSelectedCodeIteration] = useState<number>(0);

  // Fetch project details and source files
  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const proj = await projectApi.get(projectId);
      setProject(proj);

      try {
        const srcList = await sourceApi.list(projectId);
        setSources(srcList);

        if (srcList.length > 0) {
          const firstSrc = await sourceApi.get(projectId, srcList[0].id);
          setSelectedSource(firstSrc);

          // Try to load existing analysis for the first source file
          try {
            const savedAnalysis = await sourceApi.getAnalysis(projectId, firstSrc.id);
            setPhase3Analysis(savedAnalysis);
          } catch {
            // No saved analysis yet; user will trigger it
          }
        }
      } catch {
        setSources([]);
      }

      // Load existing test generations history
      try {
        const historyList = await generationApi.listGenerations(projectId);
        setGenerationsHistory(historyList);
        if (historyList.length > 0) {
          setGenerationResult(historyList[0]);

          // Load existing test refinements from PostgreSQL (Phase 5 refresh persistence)
          try {
            const refs = await refinementApi.getGenerationRefinements(projectId, historyList[0].generation_id);
            setRefinementHistory(refs);
            if (refs.length > 0) {
              setSelectedCodeIteration(refs[refs.length - 1].iteration);
            }
          } catch {
            // No refinements yet
          }
        }
      } catch {
        // No test generations yet
      }

      // Load existing test execution results from PostgreSQL
      try {
        const runs = await coverageApi.listTestResults(projectId);
        setExecutionHistory(runs);
        if (runs.length > 0) {
          setExecutionResult(runs[0]);
        }
      } catch {
        // No execution runs yet
      }

      // Load existing latest coverage results from PostgreSQL
      try {
        const cov = await coverageApi.getLatestCoverage(projectId);
        if (cov) {
          setCoverageResult(cov);
        }
      } catch {
        // No coverage measured yet
      }
    } catch (err: unknown) {
      console.error('Failed to load project details:', err);
      setError('Unable to load project. The project might not exist or access is restricted.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Load analysis whenever selected source changes
  const handleSelectSource = async (sourceId: string) => {
    if (!projectId) return;
    try {
      const full = await sourceApi.get(projectId, sourceId);
      setSelectedSource(full);
      // Try to load cached analysis for this source
      try {
        const savedAnalysis = await sourceApi.getAnalysis(projectId, sourceId);
        setPhase3Analysis(savedAnalysis);
      } catch {
        setPhase3Analysis(null);
        setAnalysisResult(null);
      }
    } catch (err) {
      console.error('Failed to load source details:', err);
    }
  };

  // Handle native file input change (.java validation, max 5 MB)
  const handleNativeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const fileName = file.name.trim();
    if (!fileName.toLowerCase().endsWith('.java')) {
      const ext = fileName.split('.').pop() || '';
      setUploadError(`Unsupported file type ".${ext}". Only Java source files (.java) are accepted.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (5 MB limit)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        `File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of 5 MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Read content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadFileName(fileName);
      setUploadSourceCode(content);
      setShowUploadForm(true);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  // Handle source file upload submit
  const handleUploadSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setUploadError(null);

    const name = uploadFileName.trim();
    if (!name.toLowerCase().endsWith('.java')) {
      setUploadError('Source file must have a .java extension');
      return;
    }
    if (!uploadSourceCode.trim()) {
      setUploadError('Source code cannot be empty');
      return;
    }

    const codeBytes = new Blob([uploadSourceCode]).size;
    if (codeBytes > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Source code exceeds the 5 MB maximum limit (${formatBytes(codeBytes)}).`);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await sourceApi.upload(projectId, {
        file_name: name,
        source_code: uploadSourceCode,
      });
      setSources((prev) => [uploaded, ...prev]);
      setSelectedSource(uploaded);
      setUploadFileName('');
      setUploadSourceCode('');
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      setUploadError('Failed to upload Java source file. Please verify syntax and size.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyProjectId = () => {
    if (!project?.id) return;
    navigator.clipboard.writeText(project.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const confirmDeleteSource = async () => {
    if (!projectId || !fileToDelete) return;
    setIsDeletingSource(true);
    try {
      await sourceApi.delete(projectId, fileToDelete.id);
      setSources((prev) => prev.filter((s) => s.id !== fileToDelete.id));
      if (selectedSource?.id === fileToDelete.id) {
        setSelectedSource(null);
        setPhase3Analysis(null);
        setAnalysisResult(null);
      }
      setFileToDelete(null);
    } catch (err) {
      console.error('Delete source failed:', err);
      alert('Failed to delete source file. Please try again.');
    } finally {
      setIsDeletingSource(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fileName = file.name.trim();
    if (!fileName.toLowerCase().endsWith('.java')) {
      const ext = fileName.split('.').pop() || '';
      setUploadError(`Unsupported file type ".${ext}". Only Java source files (.java) are accepted.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File size (${formatBytes(file.size)}) exceeds the 5 MB maximum limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadFileName(fileName);
      setUploadSourceCode(content);
      setShowUploadForm(true);
    };
    reader.readAsText(file);
  };

  // Run Java AST / Structure Analysis
  const handleRunAnalysis = async () => {
    if (!projectId) return;
    const targetSourceId = selectedSource?.id || sources[0]?.id;
    if (!targetSourceId) {
      alert('Please upload a Java source file first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await sourceApi.analyze(projectId, targetSourceId);
      setPhase3Analysis(res);
      setAnalysisResult({
        class_name: res.class_name || res.analysis?.classes?.[0]?.name || 'TargetClass',
        package: res.package || res.analysis?.package_name || null,
        imports: res.imports || res.analysis?.imports || [],
        methods: (res.methods || res.analysis?.classes?.[0]?.methods || []) as any,
        constructors: (res.constructors || res.analysis?.classes?.[0]?.constructors || []) as any,
        complexity: (res.complexity || res.analysis?.statistics) as any,
        analysis_notes: res.analysis_notes || res.analysis?.analysis_notes || [],
        analysis: res.analysis,
        analysis_id: res.analysis_id,
      });
    } catch (err: unknown) {
      console.error('Analysis failed:', err);
      alert('Failed to analyze Java source. Ensure a valid Java class is uploaded.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle class card expansion
  const toggleClassExpansion = (idx: number) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Copy raw JSON
  const handleCopyRawJson = () => {
    if (!phase3Analysis?.analysis) return;
    navigator.clipboard.writeText(JSON.stringify(phase3Analysis.analysis, null, 2));
    setCopiedRawJson(true);
    setTimeout(() => setCopiedRawJson(false), 2000);
  };

  // Generate JUnit 5 Tests via Gemini / OpenRouter
  const handleGenerateTests = async () => {
    if (!projectId || sources.length === 0) {
      alert('Please upload a Java source file first.');
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await generationApi.generate(projectId, {
        provider: selectedProvider,
        source_id: selectedSource?.id || sources[0].id,
        framework: 'junit5',
      });
      setGenerationResult(res);
      setGenerationsHistory((prev) => [res, ...prev.filter((g) => g.generation_id !== res.generation_id)]);
      if (res.status === 'invalid_generation') {
        setGenerationError(res.error_message || 'Model output failed validation rules.');
      }
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      const msg = err instanceof Error ? err.message : 'Test generation failed. Check AI provider configuration in backend.';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download generated JUnit 5 test file
  const handleDownloadTestCode = () => {
    if (!generationResult?.test_code) return;
    const baseName = selectedSource?.file_name
      ? selectedSource.file_name.replace(/\.java$/i, '')
      : 'TargetClass';
    const testFileName = `${baseName}Test.java`;

    const blob = new Blob([generationResult.test_code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = testFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute Maven & JUnit test runner (Phase 4 / Section 20)
  const handleRunTests = async () => {
    if (!projectId) return;
    const genId =
      generationResult?.generation_id ||
      (refinementHistory.length > 0 ? refinementHistory[0].generation_id : undefined);
    if (!genId) {
      alert('Please generate tests before executing.');
      return;
    }
    setIsExecuting(true);
    setExecutionError(null);
    try {
      const res = await coverageApi.runTests(projectId, { generation_id: genId });
      setExecutionResult(res);
      setExecutionHistory((prev) => [
        res,
        ...prev.filter((e) => (e.id || e.test_result_id) !== (res.id || res.test_result_id)),
      ]);

      // Automatically refresh latest coverage recorded by the Maven run
      try {
        const cov = await coverageApi.getLatestCoverage(projectId);
        if (cov) {
          setCoverageResult(cov);
        }
      } catch {
        // Ok if not yet available
      }
    } catch (err: unknown) {
      console.error('Execution failed:', err);
      const msg = err instanceof Error ? err.message : 'Execution failed. Verify Java 17 and Maven installation.';
      setExecutionError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  // Measure JaCoCo coverage (Phase 4 / Section 21)
  const handleRunCoverage = async () => {
    if (!projectId) return;
    const trId = executionResult?.test_result_id || executionResult?.id || executionResult?.result_id;
    const genId =
      generationResult?.generation_id ||
      (refinementHistory.length > 0 ? refinementHistory[0].generation_id : undefined);
    if (!trId && !genId) {
      alert('Please run tests before measuring coverage.');
      return;
    }
    setIsMeasuringCoverage(true);
    setCoverageError(null);
    try {
      const res = await coverageApi.runCoverage(projectId, {
        test_result_id: trId,
        generation_id: genId,
      });
      setCoverageResult(res);
    } catch (err: unknown) {
      console.error('Coverage measurement failed:', err);
      const msg = err instanceof Error ? err.message : 'Coverage calculation failed.';
      setCoverageError(msg);
    } finally {
      setIsMeasuringCoverage(false);
    }
  };

  // Refine tests via OpenRouter / GPT-4o (Phase 5)
  const handleRefineTests = async () => {
    if (!projectId) return;
    const genId = generationResult?.generation_id;
    if (!genId) {
      alert('Please run initial test generation before refining.');
      return;
    }
    setIsRefining(true);
    setRefinementError(null);
    setRefinementStatusText('Generating refinement with OpenRouter (GPT-4o)...');

    const step1 = setTimeout(() => setRefinementStatusText('Running Maven compile...'), 3500);
    const step2 = setTimeout(() => setRefinementStatusText('Running JUnit 5 test execution...'), 7000);
    const step3 = setTimeout(() => setRefinementStatusText('Calculating JaCoCo code coverage...'), 10500);

    try {
      const res = await refinementApi.runRefinement(projectId, {
        generation_id: genId,
        max_iterations: maxIterations,
        model: 'openai/gpt-4o',
        provider: 'openrouter',
      });

      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      setRefinementStatusText(`Refinement loop complete! Status: ${res.final_status}`);

      // Reload updated refinements from PostgreSQL
      const updatedRefs = await refinementApi.getGenerationRefinements(projectId, genId);
      setRefinementHistory(updatedRefs);
      if (updatedRefs.length > 0) {
        setSelectedCodeIteration(updatedRefs[updatedRefs.length - 1].iteration);
      }

      // Also refresh test execution history and coverage
      try {
        const runs = await coverageApi.listTestResults(projectId);
        setExecutionHistory(runs);
        if (runs.length > 0) setExecutionResult(runs[0]);
        const cov = await coverageApi.getLatestCoverage(projectId);
        if (cov) setCoverageResult(cov);
      } catch {
        // Optional
      }
    } catch (err: unknown) {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      console.error('Refinement failed:', err);
      const msg = err instanceof Error ? err.message : 'Refinement failed. Check OpenRouter configuration in backend.';
      setRefinementError(msg);
      setRefinementStatusText('Refinement failed.');
    } finally {
      setIsRefining(false);
      setTimeout(() => setRefinementStatusText(''), 4000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Sample Java template to pre-fill
  const insertSampleCalculator = () => {
    setUploadFileName('Calculator.java');
    setUploadSourceCode(`package com.testforge.math;

public class Calculator {

    public int add(int a, int b) {
        return a + b;
    }

    public int subtract(int a, int b) {
        return a - b;
    }

    public int multiply(int a, int b) {
        return a * b;
    }

    public double divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("Division by zero is not allowed.");
        }
        return (double) a / b;
    }

    public boolean isPrime(int n) {
        if (n <= 1) return false;
        for (int i = 2; i <= Math.sqrt(n); i++) {
            if (n % i == 0) return false;
        }
        return true;
    }
}`);
  };

  // Computed analysis stats
  const stats = phase3Analysis?.analysis?.statistics || {
    class_count: (analysisResult as any)?.classes?.length || (analysisResult ? 1 : 0),
    method_count: analysisResult?.methods?.length || 0,
    constructor_count: analysisResult?.constructors?.length || 0,
    field_count: analysisResult?.complexity?.field_count || 0,
    branch_count: analysisResult?.complexity?.branch_count || 0,
    line_count: analysisResult?.complexity?.line_count || 0,
  };

  const displayClasses = phase3Analysis?.analysis?.classes || (analysisResult ? [{
    name: analysisResult.class_name,
    type: 'class',
    visibility: 'public',
    constructors: analysisResult.constructors.map((c) => ({
      name: c.name,
      visibility: c.visibility,
      parameters: Array.isArray(c.parameters)
        ? c.parameters.map((p: any) => typeof p === 'string' ? { name: p, type: '' } : p)
        : [],
      throws: c.throws || [],
    })),
    fields: [],
    methods: analysisResult.methods.map((m) => ({
      name: m.name,
      visibility: m.visibility,
      static: m.is_static || false,
      return_type: m.return_type,
      parameters: Array.isArray(m.parameters)
        ? m.parameters.map((p: any) => typeof p === 'string' ? { name: p, type: '' } : p)
        : [],
      throws: m.throws || [],
    })),
  }] : []);

  const hasAnalysis = phase3Analysis !== null || analysisResult !== null;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-radial-gradient opacity-40 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-dev-grid opacity-15 pointer-events-none z-0" />

      <AppHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenPlaceholder={() => {}}
      />

      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenPlaceholder={() => {}}
      />

      <div className="flex-1 flex relative z-10">
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onOpenPlaceholder={() => {}}
        />

        <main
          id="main-content"
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto"
        >
          {/* Top Bar: Back & Action */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Projects</span>
            </button>

            <button
              type="button"
              onClick={loadProjectData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Details Header Card */}
          {project && (
            <div className="relative overflow-hidden rounded-2xl glass-panel p-6 shadow-xl shadow-black/20 space-y-4 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300">
              {/* Subtle Ambient Top Border Beam */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                      Project Workspace
                    </span>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleCopyProjectId}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Click to copy full Project ID"
                    >
                      <span>ID: {project.id.slice(0, 8)}...</span>
                      {copiedId ? (
                        <Check className="w-3 h-3 text-emerald-400 inline" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500 hover:text-cyan-400 inline" />
                      )}
                    </button>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                      {project.name}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {project.description || 'Automated Java test generation and AST refinement workspace.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-800/80 border border-slate-700/80 text-slate-200 shadow-sm">
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    {project.status || 'Active'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                    Java {project.java_version || '17'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-teal-950/60 border border-teal-800/60 text-teal-300">
                    {project.build_tool || 'Maven'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <div>
                  Created: <span className="text-slate-200 font-medium">{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  Last Updated: <span className="text-slate-200 font-medium">{new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
                <div>
                  Source Files: <span className="text-cyan-400 font-semibold">{sources.length}</span>
                </div>
                {coverageResult && coverageResult.line_coverage !== null && coverageResult.line_coverage !== undefined && (
                  <div>
                    Coverage: <span className="text-emerald-400 font-semibold">{coverageResult.line_coverage.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md overflow-x-auto scrollbar-none flex items-center gap-1 font-mono text-xs shadow-inner">
            {[
              { id: 'source', label: '1. Source Files', count: sources.length, icon: FileCode2 },
              { id: 'analysis', label: '2. Source Analysis', count: phase3Analysis ? 1 : 0, icon: Cpu },
              { id: 'generation', label: '3. Generated Tests', count: generationsHistory.length, icon: Sparkles },
              { id: 'execution', label: '4. Test Execution', count: executionHistory.length, icon: Terminal },
              { id: 'coverage', label: '5. Coverage', count: coverageResult ? '100%' : null, icon: Percent },
              { id: 'refinement', label: '6. Refinement', count: refinementHistory.length, icon: Layers },
              { id: 'experiment', label: '7. Experiment', count: null, icon: FlaskConical },
              { id: 'activity', label: '8. Activity', count: null, icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:via-cyan-500/25 dark:to-teal-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-400/60 shadow-sm shadow-cyan-950/20 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600 dark:text-cyan-400 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-cyan-50 dark:bg-cyan-400/20 text-cyan-700 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-400/40'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: SOURCE FILES (PHASE 3) */}
          {activeTab === 'source' && (
            <div className="space-y-6">
              {/* ── 1. PROJECT HEADER (Section 3) ─────────────────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-medium">
                      Java {project?.java_version || '17'} • {project?.build_tool || 'Maven'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-sans font-medium">Source workspace</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {project?.name || 'Calculator Testing'}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  {/* Hidden file input for native file browser */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".java"
                    onChange={handleNativeFileSelect}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setUploadError(null);
                      setShowUploadForm(!showUploadForm);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400 stroke-[2.5]" />
                    <span>+ Add Java Source</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || !selectedSource}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-950/40 cursor-pointer"
                    title={!selectedSource ? 'Select or upload a Java source file to analyze' : 'Analyze this Java source'}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                    )}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Source'}</span>
                  </button>
                </div>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload Form Modal/Box */}
              {showUploadForm && (
                <div className="p-5 rounded-2xl bg-[#0b101c] border border-cyan-800/60 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-semibold text-cyan-300">
                        Add Java Source File (Max 5 MB)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Browse .java</span>
                      </button>
                      <button
                        type="button"
                        onClick={insertSampleCalculator}
                        className="text-[11px] font-mono text-teal-400 hover:underline cursor-pointer"
                      >
                        Load Sample Calculator.java
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUploadSource} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        File Name <span className="text-rose-400">*</span> (must end with .java)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Calculator.java"
                        value={uploadFileName}
                        onChange={(e) => setUploadFileName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Java Source Code <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={8}
                        placeholder="package com.example;&#10;&#10;public class MyClass {&#10;    ...&#10;}"
                        value={uploadSourceCode}
                        onChange={(e) => setUploadSourceCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 resize-y"
                        required
                      />
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                        <span>Only compilable .java code supported</span>
                        <span>Size: {formatBytes(new Blob([uploadSourceCode]).size)} / 5 MB</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUploadForm(false);
                          setUploadError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save to Project</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── 2. UPLOADED FILES CARD (Section 4 & 5) ────────────────────── */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-2xl border transition-colors bg-[#090d16] p-5 space-y-4 shadow-xl shadow-black/20 ${
                  isDragging ? 'border-cyan-400 border-dashed bg-cyan-950/20' : 'border-slate-800/90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-cyan-400" />
                      <span>SOURCE FILES</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                        {sources.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Java source files in this project
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadError(null);
                      setShowUploadForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-medium transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Java Source</span>
                  </button>
                </div>

                {sources.length === 0 ? (
                  /* Clean Developer Empty State (Section 21) */
                  <div className="p-10 text-center rounded-xl bg-[#070a10] border border-dashed border-slate-800 text-slate-400 text-xs space-y-3">
                    <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-200">No Java source files</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Upload a Java source file to begin analysis.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        setShowUploadForm(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Add Java Source</span>
                    </button>
                  </div>
                ) : (
                  /* Compact Table (Section 4 & 5) */
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#070a10]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3.5">File Name</th>
                          <th className="py-2.5 px-3">Language</th>
                          <th className="py-2.5 px-3">Size</th>
                          <th className="py-2.5 px-3">Uploaded</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                        {sources.map((src) => {
                          const isSelected = selectedSource?.id === src.id;
                          return (
                            <tr
                              key={src.id}
                              onClick={() => handleSelectSource(src.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-cyan-50 dark:bg-cyan-950/25 text-cyan-800 dark:text-cyan-200 border-l-2 border-l-cyan-600 dark:border-l-cyan-400 font-medium'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-2 border-l-transparent text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <td className="py-2.5 px-3.5 flex items-center gap-2">
                                <FileCode2
                                  className={`w-4 h-4 shrink-0 ${
                                    isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'
                                  }`}
                                />
                                <span className={isSelected ? 'text-cyan-900 dark:text-cyan-200 font-semibold' : 'text-slate-800 dark:text-slate-200'}>
                                  {src.file_name}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/60 ml-1.5">
                                    Selected
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300">
                                  {src.language || 'Java'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                                {formatBytes(src.file_size_bytes ?? 0)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-500 font-mono">
                                {new Date(src.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFileToDelete(src);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title={`Delete ${src.file_name}`}
                                  aria-label={`Delete ${src.file_name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── 3. SELECTED SOURCE PREVIEW (Section 6, 7, 8, 9, 10, 11) ──── */}
              {selectedSource && (
                <div className="space-y-4">
                  {/* Professional Code Editor Viewer */}
                  <JavaCodeViewer
                    fileName={selectedSource.file_name}
                    sourceCode={selectedSource.source_code}
                    fileSizeBytes={selectedSource.file_size_bytes}
                  />

                  {/* ── 4. SOURCE ACTION BAR (Section 12) ────────────────────── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs dark:shadow-lg">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                        SOURCE ACTIONS
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Run AST parsing on <span className="text-slate-900 dark:text-slate-300 font-mono font-semibold">{selectedSource.file_name}</span> or proceed to automated test synthesis
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {hasAnalysis ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab('generation')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Generate Tests →</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRunAnalysis}
                          disabled={isAnalyzing}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                          )}
                          <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Source'}</span>
                        </button>
                      )}

                      {hasAnalysis && (
                        <button
                          type="button"
                          onClick={handleRunAnalysis}
                          disabled={isAnalyzing}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                          title="Re-run AST analysis"
                        >
                          {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>Re-Analyze</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── 5. ANALYSIS STATUS & METRICS (Section 13, 14, 15) ───── */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#090d16] p-5 space-y-4 shadow-sm dark:shadow-xl dark:shadow-black/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                          <Cpu className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            SOURCE ANALYSIS
                          </h3>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            AST structural inspection and boundary branch metrics
                          </p>
                        </div>
                      </div>

                      {/* Visual Status Indicator */}
                      <div>
                        {isAnalyzing ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-cyan-950/70 border border-cyan-800/70 text-cyan-300 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Analyzing...</span>
                          </span>
                        ) : hasAnalysis ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-950/70 border border-emerald-800/70 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Analysis complete</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-950/60 border border-amber-800/60 text-amber-300">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Not analyzed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {!hasAnalysis && !isAnalyzing && (
                      <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-slate-800 text-center space-y-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                          Analyze this Java source to identify classes, methods, branches and testable behavior.
                        </p>
                        <button
                          type="button"
                          onClick={handleRunAnalysis}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Analyze Source</span>
                        </button>
                      </div>
                    )}

                    {/* Section 14: Real Backend Metrics Row */}
                    {hasAnalysis && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                            <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Classes</span>
                            <span className="text-cyan-700 dark:text-cyan-400 text-xl font-bold">{stats.class_count ?? '--'}</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                            <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Methods</span>
                            <span className="text-teal-700 dark:text-teal-400 text-xl font-bold">{stats.method_count ?? '--'}</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                            <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Constructors</span>
                            <span className="text-indigo-700 dark:text-indigo-400 text-xl font-bold">{stats.constructor_count ?? '--'}</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                            <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Fields</span>
                            <span className="text-emerald-700 dark:text-emerald-400 text-xl font-bold">{stats.field_count ?? '--'}</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                            <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Branches</span>
                            <span className="text-amber-700 dark:text-amber-400 text-xl font-bold">{stats.branch_count ?? '--'}</span>
                          </div>
                        </div>

                        {/* Section 15: Expandable Analysis Details */}
                        <div className="rounded-xl border border-slate-800 bg-[#070a10] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setAnalysisDetailsExpanded(!analysisDetailsExpanded)}
                            className="w-full flex items-center justify-between p-3.5 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-900/40 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Code2 className="w-4 h-4 text-cyan-400" />
                              <span>Analysis Details</span>
                              {phase3Analysis?.package && (
                                <span className="text-[11px] text-slate-500 font-normal">
                                  ({phase3Analysis.package})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <span>{analysisDetailsExpanded ? 'Collapse' : 'Expand'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${analysisDetailsExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          {analysisDetailsExpanded && (
                            <div className="p-4 border-t border-slate-800 space-y-4 font-mono text-xs">
                              {/* Package & Imports */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">
                                    Package
                                  </span>
                                  <span className="text-slate-200">{phase3Analysis?.package || 'default'}</span>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">
                                    Imports ({phase3Analysis?.imports?.length || 0})
                                  </span>
                                  <span className="text-slate-300 line-clamp-1">
                                    {phase3Analysis?.imports?.length ? phase3Analysis.imports.join(', ') : 'None'}
                                  </span>
                                </div>
                              </div>

                              {/* Classes & Method Signatures */}
                              {displayClasses.map((cls, idx) => (
                                <div key={idx} className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-cyan-300 text-sm">
                                      {cls.visibility} {cls.type || 'class'} {cls.name}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {cls.methods?.length || 0} methods
                                    </span>
                                  </div>

                                  {cls.methods && cls.methods.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                                        Methods:
                                      </span>
                                      <div className="divide-y divide-slate-800/60">
                                        {cls.methods.map((m, mIdx) => (
                                          <div key={mIdx} className="py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-teal-400 font-medium">{m.return_type || 'void'}</span>
                                              <span className="text-white font-semibold">{m.name}</span>
                                              <span className="text-slate-400">
                                                ({m.parameters?.map((p) => `${p.type} ${p.name}`).join(', ') || ''})
                                              </span>
                                            </div>
                                            {m.throws && m.throws.length > 0 && (
                                              <span className="text-rose-400 text-[10px]">
                                                throws {m.throws.join(', ')}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* View Raw Analysis Toggle */}
                              <div className="pt-2 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setShowRawAnalysis(!showRawAnalysis)}
                                  className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer"
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>{showRawAnalysis ? 'Hide Raw Analysis' : 'View Raw Analysis (JSON)'}</span>
                                </button>
                              </div>

                              {showRawAnalysis && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={handleCopyRawJson}
                                    className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                                  >
                                    {copiedRawJson ? 'Copied!' : 'Copy JSON'}
                                  </button>
                                  <pre className="p-3 rounded-lg bg-[#04060a] border border-slate-800 text-[11px] overflow-x-auto max-h-64 text-slate-300">
                                    <code>{JSON.stringify(phase3Analysis?.analysis || analysisResult, null, 2)}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 6. NEXT WORKFLOW ACTIONS (Section 16) ───────────────────── */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#090d16] p-5 shadow-xl shadow-black/20 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      NEXT STEP
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Progress along the multi-LLM Java test synthesis pipeline
                    </p>
                  </div>

                  {hasAnalysis && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('generation')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 text-xs font-bold shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
                    >
                      <span>Generate Tests</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 font-mono text-xs">
                  {/* Step 1: Upload */}
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Step 1</span>
                      <span className="text-slate-200 font-medium">Source uploaded</span>
                    </div>
                  </div>

                  {/* Step 2: Analyze */}
                  <div
                    onClick={!hasAnalysis && selectedSource ? handleRunAnalysis : undefined}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-colors ${
                      hasAnalysis
                        ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                        : selectedSource
                        ? 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200 cursor-pointer hover:bg-cyan-950/50'
                        : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    {hasAnalysis ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isAnalyzing ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1 mr-1 shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block">Step 2</span>
                      <span className="font-medium">{hasAnalysis ? 'Analyzed' : 'Analyze Source'}</span>
                    </div>
                  </div>

                  {/* Step 3: Generate */}
                  <div
                    onClick={() => setActiveTab('generation')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                      generationsHistory.length > 0
                        ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                        : hasAnalysis
                        ? 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200 hover:bg-cyan-950/50'
                        : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    {generationsHistory.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-slate-600 text-[11px] ml-1 mr-1 shrink-0">○</span>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block">Step 3</span>
                      <span className="font-medium">Generate Tests</span>
                    </div>
                  </div>

                  {/* Step 4: Execution */}
                  <div
                    onClick={() => setActiveTab('execution')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                      executionHistory.length > 0
                        ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                        : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    {executionHistory.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-slate-600 text-[11px] ml-1 mr-1 shrink-0">○</span>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block">Step 4</span>
                      <span className="font-medium">Run Tests</span>
                    </div>
                  </div>

                  {/* Step 5: Coverage */}
                  <div
                    onClick={() => setActiveTab('coverage')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                      coverageResult
                        ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                        : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    {coverageResult ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-slate-600 text-[11px] ml-1 mr-1 shrink-0">○</span>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block">Step 5</span>
                      <span className="font-medium">Coverage</span>
                    </div>
                  </div>

                  {/* Step 6: Refinement */}
                  <div
                    onClick={() => setActiveTab('refinement')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                      refinementHistory.length > 0
                        ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                        : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    {refinementHistory.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-slate-600 text-[11px] ml-1 mr-1 shrink-0">○</span>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block">Step 6</span>
                      <span className="font-medium">Refinement</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 7. DELETE CONFIRMATION MODAL (Section 18) ────────────────── */}
              {fileToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in-scale">
                  <div className="w-full max-w-md rounded-2xl bg-[#0e131b] border border-slate-800 p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Delete {fileToDelete.file_name}?
                        </h3>
                        <p className="text-xs text-slate-400">
                          This will remove the source file from this project.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setFileToDelete(null)}
                        disabled={isDeletingSource}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteSource}
                        disabled={isDeletingSource}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isDeletingSource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOURCE ANALYSIS (PHASE 3) */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    SOURCE ANALYSIS
                  </h3>
                  <p className="text-xs text-slate-400">
                    AST structural parsing: package, classes, constructors, methods, parameters, return types, and branches.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hasAnalysis && (
                    <button
                      type="button"
                      onClick={() => setShowRawAnalysis(!showRawAnalysis)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{showRawAnalysis ? 'Hide Raw Analysis' : 'View Raw Analysis'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || sources.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{hasAnalysis ? 'Re-Analyze Source' : 'Analyze Source'}</span>
                  </button>
                </div>
              </div>

              {!hasAnalysis ? (
                <div className="p-12 text-center rounded-2xl bg-[#0b101c]/60 border border-slate-800 text-slate-400 text-xs space-y-3">
                  <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300 text-sm">Not analyzed yet</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Click &ldquo;Analyze Source&rdquo; to execute the AST structural analyzer on the Java code and store structured results in PostgreSQL.
                  </p>
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || sources.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Analyze Source</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Statistics counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Classes</span>
                      <span className="text-cyan-700 dark:text-cyan-400 text-xl font-bold">{stats.class_count}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Methods</span>
                      <span className="text-teal-700 dark:text-teal-400 text-xl font-bold">{stats.method_count}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Constructors</span>
                      <span className="text-indigo-700 dark:text-indigo-400 text-xl font-bold">{stats.constructor_count}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Fields</span>
                      <span className="text-emerald-700 dark:text-emerald-400 text-xl font-bold">{stats.field_count}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Branches</span>
                      <span className="text-amber-700 dark:text-amber-400 text-xl font-bold">{stats.branch_count}</span>
                    </div>
                  </div>

                  {/* Raw Analysis Collapsible */}
                  {showRawAnalysis && phase3Analysis?.analysis && (
                    <div className="rounded-xl border border-cyan-800/60 bg-[#06080e] p-4 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-cyan-400 font-semibold flex items-center gap-2">
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Structured Analysis JSON (PostgreSQL source_analyses)</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyRawJson}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          {copiedRawJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedRawJson ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] text-slate-300 overflow-x-auto p-3 bg-[#030408] rounded-lg max-h-80">
                        <code>{JSON.stringify(phase3Analysis.analysis, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {/* Expandable Class Cards */}
                  <div className="space-y-4">
                    {displayClasses.map((cls, classIdx) => {
                      const isExpanded = expandedClasses[classIdx] ?? true;
                      return (
                        <div
                          key={classIdx}
                          className="rounded-2xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-lg transition-all"
                        >
                          {/* Class Header */}
                          <div
                            onClick={() => toggleClassExpansion(classIdx)}
                            className="p-4 bg-slate-900/60 flex items-center justify-between cursor-pointer hover:bg-slate-900/90 transition-colors border-b border-slate-800"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4" />}
                              </span>
                              <span className="text-base font-bold text-white font-mono">{cls.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-300">
                                {cls.type || 'class'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                                {cls.visibility || 'public'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                              <span>Methods: <strong className="text-teal-400">{cls.methods?.length ?? 0}</strong></span>
                              <span>Constructors: <strong className="text-indigo-400">{cls.constructors?.length ?? 0}</strong></span>
                              <span>Fields: <strong className="text-slate-300">{cls.fields?.length ?? 0}</strong></span>
                            </div>
                          </div>

                          {/* Expanded Class Details */}
                          {isExpanded && (
                            <div className="p-5 space-y-6 font-mono text-xs">
                              {/* Fields Section if any */}
                              {cls.fields && cls.fields.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                    Fields ({cls.fields.length})
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {cls.fields.map((f, fIdx) => (
                                      <div
                                        key={fIdx}
                                        className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 flex items-center justify-between"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-400 text-[11px]">{f.type}</span>
                                          <span className="text-slate-200 font-semibold">{f.name}</span>
                                        </div>
                                        <div className="flex gap-1 text-[9px]">
                                          {f.static && <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300">static</span>}
                                          {f.final && <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300">final</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Constructors Section */}
                              {cls.constructors && cls.constructors.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                    Constructors ({cls.constructors.length})
                                  </span>
                                  <div className="space-y-2">
                                    {cls.constructors.map((c, cIdx) => (
                                      <div
                                        key={cIdx}
                                        className="p-3 rounded-xl bg-[#0b101c] border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">{c.visibility}</span>
                                          <span className="font-semibold text-indigo-300">{c.name}</span>
                                          <span className="text-slate-400">
                                            ({c.parameters.map((p) => `${p.type} ${p.name}`).join(', ')})
                                          </span>
                                        </div>
                                        {c.throws && c.throws.length > 0 && (
                                          <span className="text-rose-400 text-[11px]">
                                            throws {c.throws.join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Methods Section */}
                              <div className="space-y-3">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                  Methods ({cls.methods?.length ?? 0})
                                </span>

                                <div className="space-y-2">
                                  {cls.methods?.map((m, mIdx) => (
                                    <div
                                      key={mIdx}
                                      className="p-3.5 rounded-xl bg-[#0b101c] border border-slate-800/80 hover:border-cyan-800/50 transition-colors space-y-2"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                            {m.visibility}
                                          </span>
                                          {m.static && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 border border-amber-800 text-amber-300">
                                              static
                                            </span>
                                          )}
                                          <span className="text-teal-400 font-semibold">{m.return_type}</span>
                                          <span className="text-cyan-300 font-bold text-sm">{m.name}</span>
                                        </div>

                                        {m.throws && m.throws.length > 0 && (
                                          <span className="text-rose-400 text-[11px]">
                                            throws {m.throws.join(', ')}
                                          </span>
                                        )}
                                      </div>

                                      {/* Parameter Chips */}
                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <span className="text-slate-500 text-[10px]">Parameters:</span>
                                        {m.parameters.length === 0 ? (
                                          <span className="text-slate-500 italic text-[11px]">none</span>
                                        ) : (
                                          m.parameters.map((p, pIdx) => (
                                            <span
                                              key={pIdx}
                                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
                                            >
                                              <span className="text-cyan-400">{p.type}</span> {p.name}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERATED TESTS */}
          {activeTab === 'generation' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    GENERATED TESTS
                  </h3>
                  <p className="text-xs text-slate-400">
                    Synthesize comprehensive JUnit 5 unit tests with automated Java AST analysis and multi-layer validation.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Provider selector */}
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value as 'gemini' | 'openrouter' | 'agentrouter')}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="gemini">Google Gemini (Recommended)</option>
                    <option value="openrouter">OpenRouter (GPT-4o)</option>
                    <option value="agentrouter">AgentRouter (gpt-4o)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateTests}
                    disabled={isGenerating || sources.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{generationResult ? 'Regenerate Tests' : 'Generate JUnit Tests'}</span>
                  </button>
                </div>
              </div>

              {/* STATE 1: GENERATING... */}
              {isGenerating && (
                <div className="p-12 text-center rounded-2xl bg-[#0b101c]/80 border border-cyan-500/30 text-slate-300 text-xs space-y-4 shadow-xl shadow-cyan-950/20 backdrop-blur-sm animate-pulse">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base font-mono">Generating...</h4>
                    <p className="text-slate-400 text-xs max-w-md mx-auto">
                      Prompting {selectedProvider === 'gemini' ? 'Google Gemini' : selectedProvider === 'agentrouter' ? 'AgentRouter (gpt-4o)' : 'OpenRouter GPT-4o'} to synthesize complete, compilable JUnit 5 unit tests for {selectedSource?.file_name || 'selected class'}.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 py-1.5 px-3 rounded-full border border-cyan-800/40 w-fit mx-auto">
                    <Activity className="w-3 h-3 animate-spin" />
                    <span>Analyzing AST structure &bull; Extracting assertions &bull; Validating syntax</span>
                  </div>
                </div>
              )}

              {/* STATE 2: FAILED */}
              {!isGenerating && generationError && !generationResult && (
                <div className="p-8 text-center rounded-2xl bg-rose-950/20 border border-rose-800/50 text-rose-300 text-xs space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <h4 className="font-bold text-rose-200 text-sm font-mono">Failed</h4>
                  <p className="text-[11px] text-rose-300/80 max-w-md mx-auto">
                    {generationError}
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTests}
                    disabled={sources.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              )}

              {/* STATE 3: NO TESTS GENERATED YET */}
              {!isGenerating && !generationResult && !generationError && (
                <div className="p-12 text-center rounded-2xl bg-[#0b101c]/60 border border-slate-800 text-slate-400 text-xs space-y-3">
                  <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300 text-sm">No tests generated yet</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Click &ldquo;Generate JUnit Tests&rdquo; to prompt the AI model to analyze the AST structure and synthesize compilable JUnit 5 unit tests.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTests}
                    disabled={sources.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate JUnit Tests</span>
                  </button>
                </div>
              )}

              {/* STATE 4: GENERATED */}
              {!isGenerating && generationResult && (
                <div className="space-y-4">
                  {/* Validation warning banner if invalid_generation */}
                  {generationResult.status === 'invalid_generation' && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block font-mono">Validation Warning (invalid_generation)</span>
                        <span className="text-[11px] text-amber-300/80">
                          {generationResult.error_message || 'Model output failed basic Java or JUnit 5 validation checks.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 bg-[#090d16] p-3.5 rounded-xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                        Provider: {generationResult.provider}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300">
                        Model: {generationResult.model || 'gemini-2.5-flash-lite'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                        Framework: {generationResult.framework || 'junit5'}
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${
                        generationResult.status === 'generated'
                          ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                          : generationResult.status === 'invalid_generation'
                          ? 'bg-amber-950 border-amber-800 text-amber-300'
                          : 'bg-rose-950 border-rose-800 text-rose-300'
                      }`}>
                        Status: {generationResult.status}
                      </span>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Generation time: {new Date(generationResult.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {generationResult.prompt_tokens > 0 && (
                        <span className="text-slate-500 text-[11px]">
                          Tokens: {generationResult.prompt_tokens} prompt + {generationResult.completion_tokens} completion
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Copy button */}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generationResult.test_code || '')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                        title="Copy test code to clipboard"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* Download button */}
                      <button
                        type="button"
                        onClick={handleDownloadTestCode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 hover:border-cyan-600 text-cyan-300 hover:text-white text-xs cursor-pointer transition-colors"
                        title="Download .java file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      {/* Regenerate button */}
                      <button
                        type="button"
                        onClick={handleGenerateTests}
                        disabled={isGenerating || sources.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white text-xs cursor-pointer transition-colors"
                        title="Regenerate tests with selected provider"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  {/* Test Code Viewer */}
                  <div className="rounded-xl border border-slate-800 bg-[#05070c] p-4">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800 mb-3">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-slate-300 font-semibold">
                          {selectedSource?.file_name.replace(/\.java$/i, 'Test.java') || 'GeneratedTest.java'}
                        </span>
                      </div>
                      <span>{generationResult.test_code ? generationResult.test_code.split('\n').length : 0} lines</span>
                    </div>

                    <pre className="text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed select-text">
                      <code>{generationResult.test_code}</code>
                    </pre>
                  </div>

                  {/* Generation History Drawer / Table */}
                  {generationsHistory.length > 1 && (
                    <div className="rounded-xl border border-slate-800/80 bg-[#080c14] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          Generation History ({generationsHistory.length})
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">Click any run to view</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                              <th className="pb-2">Generation ID</th>
                              <th className="pb-2">Provider</th>
                              <th className="pb-2">Model</th>
                              <th className="pb-2">Status</th>
                              <th className="pb-2">Iteration</th>
                              <th className="pb-2">Created Date</th>
                              <th className="pb-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {generationsHistory.map((item) => (
                              <tr
                                key={item.generation_id}
                                className={`hover:bg-slate-900/60 transition-colors ${
                                  generationResult.generation_id === item.generation_id ? 'bg-cyan-950/20' : ''
                                }`}
                              >
                                <td className="py-2.5 text-slate-300 font-mono text-[11px]">
                                  {item.generation_id.slice(0, 8)}...
                                </td>
                                <td className="py-2.5 text-cyan-400 capitalize">{item.provider}</td>
                                <td className="py-2.5 text-slate-400">{item.model}</td>
                                <td className="py-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    item.status === 'generated'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : item.status === 'invalid_generation'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2.5 text-slate-400">{item.iteration || 0}</td>
                                <td className="py-2.5 text-slate-400 text-[11px]">
                                  {new Date(item.created_at).toLocaleString()}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setGenerationResult(item)}
                                    className={`px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                                      generationResult.generation_id === item.generation_id
                                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {generationResult.generation_id === item.generation_id ? 'Viewing' : 'View'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEST EXECUTION (Sections 19, 20, 22, 23) */}
          {activeTab === 'execution' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    TEST EXECUTION
                  </h3>
                  <p className="text-xs text-slate-400">
                    Compile generated JUnit 5 tests with Java 17 and execute via Maven Surefire test runner in an isolated workspace.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunTests}
                  disabled={isExecuting || (!generationResult && refinementHistory.length === 0)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/30"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running Tests...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run Tests</span>
                    </>
                  )}
                </button>
              </div>

              {/* Execution Error Banner */}
              {executionError && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{executionError}</span>
                </div>
              )}

              {/* Compilation Failure Warning */}
              {executionResult && !executionResult.compile_success && (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-start gap-3">
                  <XCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <strong className="block font-mono text-sm">Compilation Failed</strong>
                    <span className="text-rose-300/80">
                      Maven failed to compile the test suite. JUnit test execution was aborted to prevent errors.
                    </span>
                  </div>
                </div>
              )}

              {/* METRICS DISPLAY (Section 19) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Compilation</span>
                  <span className={`text-sm font-bold ${
                    !executionResult ? 'text-slate-500' :
                    executionResult.compile_success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {!executionResult ? '--' : executionResult.compile_success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Test Status</span>
                  <span className={`text-sm font-bold ${
                    !executionResult ? 'text-slate-500' :
                    executionResult.execution_success ? 'text-emerald-600 dark:text-emerald-400' :
                    executionResult.status === 'compilation_failed' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {!executionResult ? '--' : executionResult.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Total Tests</span>
                  <span className="text-slate-900 dark:text-slate-100 text-sm font-bold">
                    {executionResult ? (executionResult.total_tests ?? executionResult.tests_total ?? 0) : '--'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Passed</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    {executionResult ? (executionResult.passed_tests ?? executionResult.tests_passed ?? 0) : '--'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Failed</span>
                  <span className={`text-sm font-bold ${
                    executionResult && (executionResult.failed_tests ?? executionResult.tests_failed ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {executionResult ? (executionResult.failed_tests ?? executionResult.tests_failed ?? 0) : '--'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Skipped</span>
                  <span className="text-slate-600 dark:text-slate-400 text-sm font-bold">
                    {executionResult ? (executionResult.skipped_tests ?? executionResult.tests_skipped ?? 0) : '--'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase font-semibold">Execution Time</span>
                  <span className="text-cyan-700 dark:text-cyan-400 text-sm font-bold">
                    {executionResult ? `${executionResult.execution_time_ms} ms` : '--'}
                  </span>
                </div>
              </div>

              {!executionResult ? (
                <div className="p-12 text-center rounded-2xl bg-[#0b101c]/60 border border-slate-800 text-slate-400 text-xs space-y-3">
                  <Terminal className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300 text-sm">Tests not executed yet</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Click &ldquo;Run Tests&rdquo; to build the Maven test container, compile the production class and generated tests, and run JUnit 5.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* EXPANDABLE TEST EXECUTION OUTPUT UI (Sections 22 & 23) */}
                  <div className="rounded-2xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-xl">
                    <div
                      onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                      className="p-4 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">
                          {isOutputExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4" />}
                        </span>
                        <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
                          Test Execution Output
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Passed: {executionResult.passed_tests ?? executionResult.tests_passed ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed: {executionResult.failed_tests ?? executionResult.tests_failed ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          Skipped: {executionResult.skipped_tests ?? executionResult.tests_skipped ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          Errors: {executionResult.error_count ?? executionResult.tests_errored ?? 0}
                        </span>
                      </div>
                    </div>

                    {isOutputExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Tabs: Summary, Console Output, Failures */}
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                          <button
                            type="button"
                            onClick={() => setOutputTab('summary')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                              outputTab === 'summary'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Summary
                          </button>
                          <button
                            type="button"
                            onClick={() => setOutputTab('console')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                              outputTab === 'console'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Console Output
                          </button>
                          <button
                            type="button"
                            onClick={() => setOutputTab('failures')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                              outputTab === 'failures'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Failures ({executionResult.failed_tests ?? executionResult.tests_failed ?? 0})
                          </button>
                        </div>

                        {/* Tab 1: Summary */}
                        {outputTab === 'summary' && (
                          <div className="space-y-3">
                            {executionResult.test_cases && executionResult.test_cases.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead>
                                    <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                                      <th className="pb-2">Status</th>
                                      <th className="pb-2">Test Class</th>
                                      <th className="pb-2">Test Method</th>
                                      <th className="pb-2 text-right">Time</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {executionResult.test_cases.map((tc, tcIdx) => (
                                      <tr key={tcIdx} className="hover:bg-slate-900/40">
                                        <td className="py-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            tc.status === 'passed'
                                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                                          }`}>
                                            {tc.status.toUpperCase()}
                                          </span>
                                        </td>
                                        <td className="py-2 text-slate-300">{tc.class_name}</td>
                                        <td className="py-2 text-cyan-300 font-semibold">{tc.name}</td>
                                        <td className="py-2 text-right text-slate-400">
                                          {(tc.time_seconds * 1000).toFixed(0)} ms
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-mono">
                                Execution status: <strong>{executionResult.status}</strong>. Time: {executionResult.execution_time_ms} ms.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab 2: Console Output */}
                        {outputTab === 'console' && (
                          <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-96 bg-[#04060a] p-4 rounded-xl border border-slate-800 leading-relaxed">
                            <code>{executionResult.stdout || executionResult.stderr || executionResult.message || 'No console output produced.'}</code>
                          </pre>
                        )}

                        {/* Tab 3: Failures Details */}
                        {outputTab === 'failures' && (
                          <div className="space-y-3">
                            {(executionResult.failed_tests ?? executionResult.tests_failed ?? 0) === 0 ? (
                              <div className="p-4 text-center rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs font-mono">
                                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                                All executed tests passed successfully. Zero failures.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {executionResult.test_cases?.filter((tc) => tc.status !== 'passed').map((tc, fIdx) => (
                                  <div key={fIdx} className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 space-y-2 font-mono text-xs">
                                    <div className="flex items-center gap-2">
                                      <XCircle className="w-4 h-4 text-rose-400" />
                                      <span className="font-bold text-rose-200">{tc.class_name}#{tc.name}</span>
                                    </div>
                                    {tc.failure_message && (
                                      <div className="p-2.5 rounded bg-black/40 text-rose-300 font-mono text-[11px]">
                                        {tc.failure_message}
                                      </div>
                                    )}
                                    {tc.error_message && (
                                      <div className="p-2.5 rounded bg-black/40 text-amber-300 font-mono text-[11px]">
                                        {tc.error_message}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* EXECUTION HISTORY */}
                  {executionHistory.length > 1 && (
                    <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          Execution History ({executionHistory.length})
                        </span>
                        <span className="text-[11px] text-slate-500">Persisted in PostgreSQL</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                              <th className="pb-2">Execution ID</th>
                              <th className="pb-2">Status</th>
                              <th className="pb-2">Compile</th>
                              <th className="pb-2">Tests</th>
                              <th className="pb-2">Time</th>
                              <th className="pb-2">Executed At</th>
                              <th className="pb-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {executionHistory.map((item) => (
                              <tr key={item.id || item.test_result_id} className="hover:bg-slate-900/40">
                                <td className="py-2 text-slate-400 text-[11px]">
                                  {(item.id || item.test_result_id || '').slice(0, 8)}...
                                </td>
                                <td className="py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    item.execution_success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2 text-slate-300">
                                  {item.compile_success ? 'OK' : 'FAIL'}
                                </td>
                                <td className="py-2 text-slate-300">
                                  {item.passed_tests ?? item.tests_passed ?? 0}/{item.total_tests ?? item.tests_total ?? 0}
                                </td>
                                <td className="py-2 text-cyan-400">{item.execution_time_ms} ms</td>
                                <td className="py-2 text-slate-500 text-[11px]">
                                  {item.created_at ? new Date(item.created_at).toLocaleString() : '--'}
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setExecutionResult(item)}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CODE COVERAGE (Sections 19 & 21) */}
          {activeTab === 'coverage' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Percent className="w-4 h-4 text-cyan-400" />
                    CODE COVERAGE
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real measured JaCoCo code coverage extracted from target/site/jacoco/jacoco.xml.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunCoverage}
                  disabled={isMeasuringCoverage || (!generationResult && refinementHistory.length === 0)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/30"
                >
                  {isMeasuringCoverage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calculating Coverage...</span>
                    </>
                  ) : (
                    <>
                      <Percent className="w-4 h-4" />
                      <span>Calculate Coverage</span>
                    </>
                  )}
                </button>
              </div>

              {/* Coverage Error / Unavailable banner */}
              {coverageError && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <div>
                    <strong className="block font-mono">Coverage unavailable</strong>
                    <span className="text-rose-300/80">{coverageError}</span>
                  </div>
                </div>
              )}

              {/* 5 Metrics Grid (Section 19: Line, Branch, Instruction, Method, Class Coverage) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
                <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Line Coverage</span>
                  <span className="text-3xl font-bold text-cyan-400">
                    {coverageResult && coverageResult.line_coverage !== null && coverageResult.line_coverage !== undefined
                      ? `${coverageResult.line_coverage.toFixed(1)}%`
                      : '--'}
                  </span>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, coverageResult?.line_coverage ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Branch Coverage</span>
                  <span className="text-3xl font-bold text-teal-400">
                    {coverageResult && coverageResult.branch_coverage !== null && coverageResult.branch_coverage !== undefined
                      ? `${coverageResult.branch_coverage.toFixed(1)}%`
                      : '--'}
                  </span>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, coverageResult?.branch_coverage ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Instruction Coverage</span>
                  <span className="text-3xl font-bold text-indigo-400">
                    {coverageResult && coverageResult.instruction_coverage !== null && coverageResult.instruction_coverage !== undefined
                      ? `${coverageResult.instruction_coverage.toFixed(1)}%`
                      : '--'}
                  </span>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, coverageResult?.instruction_coverage ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Method Coverage</span>
                  <span className="text-3xl font-bold text-emerald-400">
                    {coverageResult && coverageResult.method_coverage !== null && coverageResult.method_coverage !== undefined
                      ? `${coverageResult.method_coverage.toFixed(1)}%`
                      : '--'}
                  </span>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, coverageResult?.method_coverage ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Class Coverage</span>
                  <span className="text-3xl font-bold text-amber-400">
                    {coverageResult && coverageResult.class_coverage !== null && coverageResult.class_coverage !== undefined
                      ? `${coverageResult.class_coverage.toFixed(1)}%`
                      : '--'}
                  </span>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, coverageResult?.class_coverage ?? 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {!coverageResult && (
                <div className="p-12 text-center rounded-2xl bg-[#0b101c]/60 border border-slate-800 text-slate-400 text-xs space-y-2">
                  <Percent className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300">Coverage not measured yet</p>
                  <p className="text-[11px] text-slate-500">
                    Run tests and click &ldquo;Calculate Coverage&rdquo; to execute the JaCoCo Maven plugin and parse machine-readable coverage data.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: REFINEMENT (Phase 5: Sections 15, 16, 17, 18, 19, 29) */}
          {activeTab === 'refinement' && (
            <div className="space-y-6">
              {/* Header Card with Settings & Trigger */}
              <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-6 shadow-xl space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                        Phase 5 Multi-LLM Chaining
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] font-mono text-slate-400">OpenRouter / GPT-4o</span>
                    </div>
                    <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 mt-1">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      <span>TEST REFINEMENT</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Iteratively heals failing tests and expands JaCoCo edge case branch coverage using real execution feedback and multi-model feedback chaining.
                    </p>
                  </div>

                  {/* Refinement Configuration & Action Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#04060a] px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs">
                      <span className="text-slate-400">Max Iterations:</span>
                      <select
                        aria-label="Max Iterations"
                        value={maxIterations}
                        onChange={(e) => setMaxIterations(Number(e.target.value))}
                        disabled={isRefining}
                        className="bg-slate-900 text-cyan-300 font-bold px-2 py-0.5 rounded border border-slate-700 outline-none cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefineTests}
                      disabled={isRefining || !generationResult}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400 hover:from-indigo-400 hover:to-teal-300 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-950/40"
                    >
                      {isRefining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Running Refinement...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>Refine Tests</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Metadata summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Initial Generation</span>
                    <span className="text-slate-300 font-semibold truncate block">
                      {generationResult ? `${generationResult.generation_id.slice(0, 10)}...` : '--'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Refinement Provider</span>
                    <span className="text-indigo-400 font-semibold block">OpenRouter</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Refinement Model</span>
                    <span className="text-cyan-400 font-semibold block">openai/gpt-4o</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Iterations Logged</span>
                    <span className="text-emerald-400 font-semibold block">{refinementHistory.length}</span>
                  </div>
                </div>
              </div>

              {/* Progress UI (Section 16) */}
              {refinementStatusText && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/60 text-indigo-300 text-xs font-mono flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-400" />
                  <span className="font-semibold">{refinementStatusText}</span>
                </div>
              )}

              {/* Error Banner */}
              {refinementError && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <div>
                    <strong className="block">Refinement Failed</strong>
                    <span className="text-rose-300/80">{refinementError}</span>
                  </div>
                </div>
              )}

              {/* ITERATION TABLE (Section 17) */}
              <div className="rounded-2xl border border-slate-800 bg-[#090d16] p-5 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-slate-200 uppercase tracking-wider">
                      Refinement History ({refinementHistory.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">Persisted in PostgreSQL</span>
                </div>

                {refinementHistory.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800/60 text-slate-500 text-xs">
                    No refinements run yet. Select max iterations and click &ldquo;Refine Tests&rdquo; to begin.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                          <th className="pb-2.5">Iteration</th>
                          <th className="pb-2.5">Provider</th>
                          <th className="pb-2.5">Model</th>
                          <th className="pb-2.5">Compilation</th>
                          <th className="pb-2.5">Line Cov</th>
                          <th className="pb-2.5">Branch Cov</th>
                          <th className="pb-2.5">Latency</th>
                          <th className="pb-2.5">Status</th>
                          <th className="pb-2.5 text-right">View Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {refinementHistory.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-900/50 transition-colors ${
                              selectedCodeIteration === item.iteration ? 'bg-indigo-950/20' : ''
                            }`}
                          >
                            <td className="py-2.5 font-bold text-indigo-300">
                              Iteration {item.iteration}
                            </td>
                            <td className="py-2.5 text-slate-400">{item.provider}</td>
                            <td className="py-2.5 text-slate-300">{item.model}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.compilation_status === 'success'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {item.compilation_status || 'N/A'}
                              </span>
                            </td>
                            <td className="py-2.5 text-cyan-400 font-bold">
                              {item.line_coverage !== null && item.line_coverage !== undefined
                                ? `${item.line_coverage.toFixed(1)}%`
                                : '--'}
                            </td>
                            <td className="py-2.5 text-teal-400 font-bold">
                              {item.branch_coverage !== null && item.branch_coverage !== undefined
                                ? `${item.branch_coverage.toFixed(1)}%`
                                : '--'}
                            </td>
                            <td className="py-2.5 text-slate-400">
                              {item.latency_ms ? `${item.latency_ms} ms` : '--'}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.status === 'completed'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCodeIteration(item.iteration)}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                  selectedCodeIteration === item.iteration
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {selectedCodeIteration === item.iteration ? 'Active' : 'Inspect'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TEST CODE COMPARISON & VIEWER (Section 18) */}
              <div className="rounded-2xl border border-slate-800 bg-[#090d16] p-5 space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span>Test Code Switcher</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Compare test suites across iterations without overwriting earlier code.
                    </p>
                  </div>

                  {/* Switcher Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-[#04060a] p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedCodeIteration(0)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedCodeIteration === 0
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Initial Test (Iteration 0)
                    </button>
                    {refinementHistory.map((item) => (
                      <button
                        key={item.iteration}
                        type="button"
                        onClick={() => setSelectedCodeIteration(item.iteration)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          selectedCodeIteration === item.iteration
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Iteration {item.iteration}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display active code */}
                {(() => {
                  const activeCode =
                    selectedCodeIteration === 0
                      ? generationResult?.test_code || 'No initial test code available.'
                      : refinementHistory.find((r) => r.iteration === selectedCodeIteration)
                          ?.refined_test_code || 'No code recorded for this refinement iteration.';

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                        <span className="text-slate-300 font-semibold">
                          {selectedCodeIteration === 0
                            ? 'Showing Initial Gemini JUnit 5 Test Suite (Iteration 0)'
                            : `Showing Refined Test Suite from Iteration ${selectedCodeIteration}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeCode)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                          </button>
                        </div>
                      </div>

                      <pre className="p-4 rounded-xl border border-slate-800 bg-[#04060a] text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
                        <code>{activeCode}</code>
                      </pre>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 7: EXPERIMENT */}
          {activeTab === 'experiment' && (
            <div className="p-12 text-center rounded-2xl bg-[#0b101c]/60 border border-slate-800 text-slate-400 text-xs space-y-2">
              <FlaskConical className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">Not run yet</p>
              <p className="text-[11px] text-slate-500">
                Configure model comparison benchmarks (Gemini vs GPT-4o) in the Experiments module.
              </p>
            </div>
          )}

          {/* TAB 8: ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="rounded-2xl bg-[#090d16] border border-slate-800/90 p-6 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Project Audit Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Clock className="w-4 h-4 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-slate-200 font-semibold block">Project Initialized</span>
                    <span className="text-[11px] text-slate-500">
                      {project?.created_at ? new Date(project.created_at).toLocaleString() : '--'}
                    </span>
                  </div>
                </div>

                {sources.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <FileCode2 className="w-4 h-4 text-teal-400 mt-0.5" />
                    <div>
                      <span className="text-slate-200 font-semibold block">Source File Uploaded: {s.file_name}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
