/**
 * refinementApi.ts — Test refinement API service for Phase 5.
 *
 * Implements:
 * - refineTests()
 * - runRefinement()
 * - getRefinements()
 * - getRefinement()
 * - getGenerationRefinements()
 */

import { api } from './api';

export interface RefineTestsRequest {
  generation_id: string;
  max_iterations?: number;
  model?: string;
  provider?: string;
}

export interface RefinementMetrics {
  line_coverage?: number | null;
  branch_coverage?: number | null;
  passed_tests?: number;
  failed_tests?: number;
}

export interface RefinementResponse {
  refinement_id: string;
  generation_id: string;
  iteration: number;
  provider: string;
  model: string;
  status: string;
  test_code: string;
  before: RefinementMetrics;
  after: RefinementMetrics;
  error_message?: string | null;
}

export interface RefinementRecordOut {
  id: string;
  project_id: string;
  generation_id: string;
  parent_result_id?: string | null;
  provider: string;
  model: string;
  iteration: number;
  input_test_code: string;
  refined_test_code?: string | null;
  compilation_status?: string | null;
  execution_status?: string | null;
  line_coverage?: number | null;
  branch_coverage?: number | null;
  instruction_coverage?: number | null;
  mutation_score?: number | null;
  feedback_json?: Record<string, any> | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  latency_ms?: number | null;
  status: string;
  error_message?: string | null;
  created_at: string;
}

export interface RefinementRunSummary {
  generation_id: string;
  project_id: string;
  iterations_count: number;
  final_status: string;
  final_test_code?: string | null;
  iterations: RefinementResponse[];
}

export const refinementApi = {
  /**
   * Run a single refinement iteration using OpenRouter / GPT-4o.
   */
  refineTests(projectId: string, payload: RefineTestsRequest): Promise<RefinementResponse> {
    return api.post<RefinementResponse>(`/api/projects/${projectId}/refine-tests`, payload, true);
  },

  /**
   * Run automated multi-iteration refinement loop (1 to 5 iterations).
   */
  runRefinement(projectId: string, payload: RefineTestsRequest): Promise<RefinementRunSummary> {
    return api.post<RefinementRunSummary>(`/api/projects/${projectId}/refine-tests/run`, payload, true);
  },

  /**
   * List all test refinements for a project.
   */
  getRefinements(projectId: string): Promise<RefinementRecordOut[]> {
    return api.get<RefinementRecordOut[]>(`/api/projects/${projectId}/refinements`, true);
  },

  /**
   * Get a specific test refinement by ID.
   */
  getRefinement(projectId: string, refinementId: string): Promise<RefinementRecordOut> {
    return api.get<RefinementRecordOut>(`/api/projects/${projectId}/refinements/${refinementId}`, true);
  },

  /**
   * Get all test refinements for a specific generation ordered by iteration ASC.
   */
  getGenerationRefinements(projectId: string, generationId: string): Promise<RefinementRecordOut[]> {
    return api.get<RefinementRecordOut[]>(
      `/api/projects/${projectId}/generations/${generationId}/refinements`,
      true
    );
  },
};
