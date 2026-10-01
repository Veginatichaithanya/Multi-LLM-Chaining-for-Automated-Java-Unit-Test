/**
 * experimentApi.ts — Phase 6 Experiment API client.
 *
 * Interfaces match Phase 6 backend schemas exactly.
 */

import { api, AI_TIMEOUT_MS } from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export type ExperimentConfiguration =
  | 'gemini_only'
  | 'openrouter_only'
  | 'gemini_to_openrouter'
  | 'agentrouter_only'
  | 'gemini_to_agentrouter'
  | 'gemini'
  | 'openrouter'
  | 'agentrouter'
  | 'gemini_to_gpt4o';

export type ExperimentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExperimentMetricOut {
  id: string;
  experiment_id: string;
  experiment_run_id: string;
  generated_test_count: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  compilation_success: boolean;
  execution_success: boolean;
  line_coverage: number | null;
  branch_coverage: number | null;
  instruction_coverage: number | null;
  method_coverage: number | null;
  class_coverage: number | null;
  mutation_score: number | null;
  total_execution_time_ms: number;
  refinement_iterations: number;
  created_at: string;
}

export interface ExperimentRunOut {
  id: string;
  experiment_id: string;
  iteration: number;
  provider: string;
  model: string;
  generation_id: string | null;
  test_result_id: string | null;
  coverage_result_id: string | null;
  refinement_id: string | null;
  status: string;
  execution_time_ms: number;
  created_at: string;
  metrics: ExperimentMetricOut[];
}

export interface ExperimentOut {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  configuration: ExperimentConfiguration;
  initial_provider: string;
  initial_model: string;
  refinement_provider: string | null;
  refinement_model: string | null;
  framework: string;
  java_version: string;
  build_tool: string;
  max_iterations: number;
  status: ExperimentStatus;
  generation_id: string | null;
  test_result_id: string | null;
  line_coverage: number | null;
  branch_coverage: number | null;
  mutation_score: number | null;
  execution_time_ms: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ExperimentDetailOut extends ExperimentOut {
  runs: ExperimentRunOut[];
  metrics: ExperimentMetricOut[];
}

export interface ExperimentComparisonItem {
  id: string;
  name: string;
  configuration: ExperimentConfiguration;
  initial_provider: string;
  initial_model: string;
  refinement_provider: string | null;
  refinement_model: string | null;
  status: string;
  line_coverage: number | null;
  branch_coverage: number | null;
  instruction_coverage: number | null;
  method_coverage: number | null;
  class_coverage: number | null;
  compilation_success: boolean;
  execution_success: boolean;
  passed_tests: number;
  failed_tests: number;
  total_tests: number;
  execution_time_ms: number;
  refinement_iterations: number;
  created_at: string;
}

export interface ExperimentCompareResponse {
  experiments: ExperimentComparisonItem[];
}

export interface CreateExperimentPayload {
  project_id: string;
  name: string;
  description?: string;
  configuration?: ExperimentConfiguration;
  initial_provider?: string;
  initial_model?: string;
  refinement_provider?: string;
  refinement_model?: string;
  max_iterations?: number;
  framework?: string;
  source_id?: string;
}

// ── API client ───────────────────────────────────────────────────────────────

export const experimentApi = {
  create(payload: CreateExperimentPayload): Promise<ExperimentOut> {
    return api.post<ExperimentOut>('/api/experiments', payload, true);
  },

  list(projectId?: string): Promise<ExperimentOut[]> {
    const url = projectId
      ? `/api/experiments?project_id=${projectId}`
      : '/api/experiments';
    return api.get<ExperimentOut[]>(url, true);
  },

  get(experimentId: string): Promise<ExperimentDetailOut> {
    return api.get<ExperimentDetailOut>(`/api/experiments/${experimentId}`, true);
  },

  run(experimentId: string, sourceId?: string): Promise<ExperimentOut> {
    return api.post<ExperimentOut>(
      `/api/experiments/${experimentId}/run`,
      { source_id: sourceId ?? null },
      true,
      AI_TIMEOUT_MS,
    );
  },

  compare(ids: string[]): Promise<ExperimentCompareResponse> {
    return api.get<ExperimentCompareResponse>(
      `/api/experiments/compare?ids=${ids.join(',')}`,
      true,
    );
  },
};
