import React, { useState, useMemo } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileSidebar } from '../components/layout/MobileSidebar';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers,
  FileCode2,
  X,
  Eye,
} from 'lucide-react';

interface TestReportItem {
  id: string;
  project_id: string;
  project_name: string;
  report_type: 'JaCoCo Coverage' | 'JUnit Execution' | 'PIT Mutation';
  test_class: string;
  passed_tests: number;
  total_tests: number;
  line_coverage: number;
  branch_coverage: number;
  mutation_score: number;
  duration_ms: number;
  status: 'passed' | 'failed' | 'warning';
  timestamp: string;
  details?: {
    methods: { name: string; covered: boolean; branches: string }[];
    mutants?: { operator: string; status: 'KILLED' | 'SURVIVED'; line: number }[];
    error_message?: string;
  };
}

const MOCK_REPORTS: TestReportItem[] = [
  {
    id: 'rep_001',
    project_id: 'proj_mock_001',
    project_name: 'BankingSystemCore',
    report_type: 'JaCoCo Coverage',
    test_class: 'com.bank.service.TransactionManagerTest',
    passed_tests: 18,
    total_tests: 18,
    line_coverage: 88.5,
    branch_coverage: 82.0,
    mutation_score: 84.0,
    duration_ms: 1420,
    status: 'passed',
    timestamp: '2026-09-28 10:15:22',
    details: {
      methods: [
        { name: 'transferFunds(Account, Account, BigDecimal)', covered: true, branches: '4/4' },
        { name: 'validateAccountLimits(Account, BigDecimal)', covered: true, branches: '2/2' },
        { name: 'rollbackTransaction(String)', covered: true, branches: '2/2' },
        { name: 'auditTransactionLog(TransactionRecord)', covered: false, branches: '1/2' },
      ],
    },
  },
  {
    id: 'rep_002',
    project_id: 'proj_mock_001',
    project_name: 'BankingSystemCore',
    report_type: 'PIT Mutation',
    test_class: 'com.bank.service.AccountSecurityTest',
    passed_tests: 12,
    total_tests: 12,
    line_coverage: 92.0,
    branch_coverage: 85.7,
    mutation_score: 89.2,
    duration_ms: 3840,
    status: 'passed',
    timestamp: '2026-09-28 09:48:10',
    details: {
      methods: [
        { name: 'authenticateBearer(String)', covered: true, branches: '2/2' },
        { name: 'enforceTwoFactor(UserSession)', covered: true, branches: '4/4' },
      ],
      mutants: [
        { operator: 'ConditionalsBoundaryMutator', status: 'KILLED', line: 42 },
        { operator: 'ReturnValsMutator', status: 'KILLED', line: 58 },
        { operator: 'VoidMethodCallMutator', status: 'KILLED', line: 71 },
        { operator: 'MathMutator', status: 'SURVIVED', line: 89 },
      ],
    },
  },
  {
    id: 'rep_003',
    project_id: 'proj_mock_002',
    project_name: 'InventoryManager',
    report_type: 'JUnit Execution',
    test_class: 'com.inventory.stock.WarehouseTrackerTest',
    passed_tests: 15,
    total_tests: 16,
    line_coverage: 78.4,
    branch_coverage: 68.2,
    mutation_score: 72.0,
    duration_ms: 1105,
    status: 'failed',
    timestamp: '2026-09-27 16:32:00',
    details: {
      methods: [
        { name: 'allocateStock(StockItem, int)', covered: true, branches: '3/4' },
        { name: 'reserveExpeditedShipment(Order)', covered: false, branches: '0/2' },
      ],
      error_message: 'AssertionFailedError: expected:<STOCK_RESERVED> but was:<OUT_OF_STOCK> at line 104',
    },
  },
  {
    id: 'rep_004',
    project_id: 'proj_mock_003',
    project_name: 'OrderProcessingService',
    report_type: 'JaCoCo Coverage',
    test_class: 'com.order.pipeline.PaymentRouterTest',
    passed_tests: 24,
    total_tests: 24,
    line_coverage: 94.6,
    branch_coverage: 91.2,
    mutation_score: 93.5,
    duration_ms: 2150,
    status: 'passed',
    timestamp: '2026-09-27 14:10:45',
    details: {
      methods: [
        { name: 'routePayment(PaymentRequest)', covered: true, branches: '6/6' },
        { name: 'handleGatewayTimeout(PaymentContext)', covered: true, branches: '4/4' },
      ],
    },
  },
];

export const ReportsPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeReport, setActiveReport] = useState<TestReportItem | null>(null);

  const filteredReports = useMemo(() => {
    return MOCK_REPORTS.filter((rep) => {
      const matchesSearch =
        rep.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.test_class.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || rep.report_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || rep.status === selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, selectedType, selectedStatus]);

  const stats = useMemo(() => {
    const totalReports = MOCK_REPORTS.length;
    const avgLine = (MOCK_REPORTS.reduce((acc, r) => acc + r.line_coverage, 0) / totalReports).toFixed(1);
    const avgBranch = (MOCK_REPORTS.reduce((acc, r) => acc + r.branch_coverage, 0) / totalReports).toFixed(1);
    const avgMutation = (MOCK_REPORTS.reduce((acc, r) => acc + r.mutation_score, 0) / totalReports).toFixed(1);
    const totalTests = MOCK_REPORTS.reduce((acc, r) => acc + r.total_tests, 0);
    const totalPassed = MOCK_REPORTS.reduce((acc, r) => acc + r.passed_tests, 0);

    return { avgLine, avgBranch, avgMutation, totalTests, totalPassed };
  }, []);

  const handleExportCSV = () => {
    const headers = 'ID,Project,Type,Class,Passed,Total,Line Coverage,Branch Coverage,Mutation Score,Status,Timestamp\n';
    const rows = filteredReports
      .map(
        (r) =>
          `"${r.id}","${r.project_name}","${r.report_type}","${r.test_class}",${r.passed_tests},${r.total_tests},${r.line_coverage}%,${r.branch_coverage}%,${r.mutation_score}%,"${r.status}","${r.timestamp}"`,
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `testforge_reports_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AppHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenPlaceholder={() => {}}
      />

      <div className="flex-1 flex w-full">
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onOpenPlaceholder={() => {}}
        />

        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onOpenPlaceholder={() => {}}
        />

        <main className="flex-1 min-w-0 px-4 md:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                  <FileText className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                  Quality & Coverage Reports
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-400">
                Review JaCoCo bytecode coverage, JUnit 5 test executions, and PIT mutation test diagnostics.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold
                           bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700
                           transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Line Coverage</span>
                <Percent className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{stats.avgLine}%</span>
                <span className="text-[11px] font-medium text-emerald-400 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> JaCoCo Real
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Average across active projects</p>
            </div>

            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Branch Coverage</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{stats.avgBranch}%</span>
                <span className="text-[11px] font-medium text-indigo-400">Control Flow</span>
              </div>
              <p className="text-[11px] text-slate-500">Condition paths validated</p>
            </div>

            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Mutation Score</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{stats.avgMutation}%</span>
                <span className="text-[11px] font-medium text-emerald-400">PIT Engine</span>
              </div>
              <p className="text-[11px] text-slate-500">Synthesized mutants killed</p>
            </div>

            <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">JUnit Pass Rate</span>
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">
                  {stats.totalPassed}/{stats.totalTests}
                </span>
                <span className="text-[11px] font-medium text-cyan-400">
                  {Math.round((stats.totalPassed / (stats.totalTests || 1)) * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Assertions verified green</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800/80">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by project or test class name..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Type:</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="JaCoCo Coverage">JaCoCo Coverage</option>
                  <option value="JUnit Execution">JUnit Execution</option>
                  <option value="PIT Mutation">PIT Mutation</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="hidden sm:inline">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="rounded-2xl bg-[#090d16] border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Report & Test Class</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Tests</th>
                    <th className="py-3 px-4">Line Cov</th>
                    <th className="py-3 px-4">Branch Cov</th>
                    <th className="py-3 px-4">Mutation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No reports matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                        onClick={() => setActiveReport(report)}
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="font-mono text-xs truncate max-w-xs">{report.test_class}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{report.project_name}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                              report.report_type === 'JaCoCo Coverage'
                                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50'
                                : report.report_type === 'PIT Mutation'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                                : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                            }`}
                          >
                            {report.report_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="text-emerald-400 font-semibold">{report.passed_tests}</span>
                          <span className="text-slate-500">/{report.total_tests}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-cyan-400">{report.line_coverage}%</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{report.branch_coverage}%</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">{report.mutation_score}%</td>
                        <td className="py-3.5 px-4">
                          {report.status === 'passed' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveReport(report);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Report Inspector Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0d1117] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  {activeReport.report_type} Diagnostic Details
                </span>
                <h3 className="text-base font-semibold text-slate-100 mt-1 font-mono break-all">
                  {activeReport.test_class}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Project: <span className="text-slate-200 font-medium">{activeReport.project_name}</span> • Executed in {activeReport.duration_ms} ms
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Line Cov</span>
                <p className="text-lg font-bold text-cyan-400">{activeReport.line_coverage}%</p>
              </div>
              <div className="text-center border-x border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Branch Cov</span>
                <p className="text-lg font-bold text-indigo-400">{activeReport.branch_coverage}%</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Mutation Score</span>
                <p className="text-lg font-bold text-emerald-400">{activeReport.mutation_score}%</p>
              </div>
            </div>

            {/* Method Breakdown */}
            {activeReport.details?.methods && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Method-Level Coverage
                </h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                  {activeReport.details.methods.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-900/40 border-b border-slate-800/60 last:border-0"
                    >
                      <span className="font-mono text-slate-300 truncate max-w-md">{m.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">{m.branches} branches</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.covered ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {m.covered ? 'Covered' : 'Uncovered'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mutants Breakdown */}
            {activeReport.details?.mutants && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Synthesized Mutants
                </h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                  {activeReport.details.mutants.map((mut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-900/40 border-b border-slate-800/60 last:border-0"
                    >
                      <span className="font-mono text-slate-300">
                        Line {mut.line}: {mut.operator}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          mut.status === 'KILLED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {mut.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failure diagnostics */}
            {activeReport.details?.error_message && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs font-mono text-rose-300">
                {activeReport.details.error_message}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
