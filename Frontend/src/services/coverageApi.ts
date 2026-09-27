/**
 * coverageApi.ts — Test execution and coverage API client.
 */

import { api } from './api';

export interface ExecutionRequest {
  generation_id: string;
}

export interface TestCaseResult {
  class_name: string;
  name: string;
  time_seconds: number;
  status: 'passed' | 'failed' | 'error' | 'skipped' | string;
  failure_message?: string | null;
  error_message?: string | null;
}

export interface TestExecutionResult {
  id?: string;
  test_result_id?: string;
  result_id?: string;
  generation_id?: string | null;
  status: string; // "completed", "compilation_failed", "failed", "timeout", "not_supported", "not_available"
  compile_success: boolean;
  execution_success: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  error_count: number;
  execution_time_ms: number;
  stdout?: string | null;
  stderr?: string | null;
  message?: string | null;
  error_message?: string | null;
  test_cases?: TestCaseResult[];
  created_at?: string | null;

  // Backwards compatibility aliases
  tests_total?: number;
  tests_passed?: number;
  tests_failed?: number;
  tests_errored?: number;
  tests_skipped?: number;
}

export interface CoverageRequest {
  test_result_id?: string;
  generation_id?: string;
}

export interface CoverageResult {
  id?: string;
  result_id?: string | null;
  project_id?: string;
  test_result_id?: string | null;
  generation_id?: string | null;
  line_coverage: number | null;
  branch_coverage: number | null;
  instruction_coverage: number | null;
  method_coverage: number | null;
  class_coverage: number | null;
  status: string;
  created_at?: string | null;
  error_message?: string | null;
}

export interface MutationResult {
  result_id: string | null;
  generation_id: string | null;
  mutation_score: number | null;
  killed_mutations: number;
  survived_mutations: number;
  total_mutations: number;
  status: string;
  error_message: string | null;
}

export const coverageApi = {
  runTests(projectId: string, payload: ExecutionRequest): Promise<TestExecutionResult> {
    return api.post<TestExecutionResult>(`/api/projects/${projectId}/run-tests`, payload, true);
  },

  listTestResults(projectId: string): Promise<TestExecutionResult[]> {
    return api.get<TestExecutionResult[]>(`/api/projects/${projectId}/test-results`, true);
  },

  getTestResult(projectId: string, resultId: string): Promise<TestExecutionResult> {
    return api.get<TestExecutionResult>(`/api/projects/${projectId}/test-results/${resultId}`, true);
  },

  runCoverage(projectId: string, payload: CoverageRequest): Promise<CoverageResult> {
    return api.post<CoverageResult>(`/api/projects/${projectId}/coverage`, payload, true);
  },

  getLatestCoverage(projectId: string): Promise<CoverageResult | null> {
    return api.get<CoverageResult | null>(`/api/projects/${projectId}/coverage`, true);
  },

  getCoverageById(projectId: string, coverageId: string): Promise<CoverageResult> {
    return api.get<CoverageResult>(`/api/projects/${projectId}/coverage/${coverageId}`, true);
  },

  runMutationTest(projectId: string, payload: ExecutionRequest): Promise<MutationResult> {
    return api.post<MutationResult>(`/api/projects/${projectId}/mutation-test`, payload, true);
  },
};
