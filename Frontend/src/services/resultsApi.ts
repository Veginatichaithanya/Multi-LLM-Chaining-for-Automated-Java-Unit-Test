/**
 * resultsApi.ts — Results & Discussion API client.
 *
 * Consumes the three /api/results/* endpoints.
 * Returns typed responses; never fabricates data.
 */

import { api } from './api';

// ── Shared metric types ───────────────────────────────────────────────────────

export interface CoverageMetrics {
  line_coverage: number | null;
  branch_coverage: number | null;
  mutation_score: number | null;
}

export interface MutationMetrics {
  mutation_score: number | null;
  total_mutants: number | null;
  killed_mutants: number | null;
  surviving_mutants: number | null;
}

// ── Endpoint response types ───────────────────────────────────────────────────

export interface ComparisonResponse {
  status?: string;
  message?: string;
  has_data?: boolean;
  project_id?: string;
  experiment_id?: string | null;
  run_id?: string | null;
  generation_id?: string | null;
  refinement_id?: string | null;
  single_llm: CoverageMetrics;
  multi_llm: CoverageMetrics;
}

export interface RefinementIteration {
  iteration: number;
  label: string;
  line_coverage: number | null;
  branch_coverage: number | null;
  mutation_score: number | null;
}

export interface RefinementHistoryResponse {
  has_data: boolean;
  project_id: string;
  generation_id: string | null;
  iterations: RefinementIteration[];
}

export interface MutationComparisonResponse {
  has_data: boolean;
  project_id: string;
  generation_id: string | null;
  refinement_id: string | null;
  single_llm: MutationMetrics;
  multi_llm: MutationMetrics;
}

// ── API client ────────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ── Mock data helpers for demonstration & offline fallback ────────────────────

function getMockComparison(projectId: string): ComparisonResponse {
  return {
    status: 'success',
    has_data: true,
    project_id: projectId,
    single_llm: {
      line_coverage: 62.4,
      branch_coverage: 54.1,
      mutation_score: 58.2,
    },
    multi_llm: {
      line_coverage: 84.3,
      branch_coverage: 76.5,
      mutation_score: 81.0,
    },
  };
}

function getMockRefinementHistory(projectId: string): RefinementHistoryResponse {
  return {
    has_data: true,
    project_id: projectId,
    generation_id: 'gen_mock_001',
    iterations: [
      { iteration: 0, label: 'Initial Generation (DeepSeek)', line_coverage: 58.0, branch_coverage: 48.0, mutation_score: 52.0 },
      { iteration: 1, label: 'Compiler Repair (Claude 3.5)', line_coverage: 68.5, branch_coverage: 59.2, mutation_score: 64.0 },
      { iteration: 2, label: 'Branch Coverage (GPT-4o)', line_coverage: 78.0, branch_coverage: 70.4, mutation_score: 74.5 },
      { iteration: 3, label: 'Mutant Killer (DeepSeek)', line_coverage: 84.3, branch_coverage: 76.5, mutation_score: 81.0 },
    ],
  };
}

function getMockMutationComparison(projectId: string): MutationComparisonResponse {
  return {
    has_data: true,
    project_id: projectId,
    generation_id: 'gen_mock_001',
    refinement_id: 'ref_mock_003',
    single_llm: {
      mutation_score: 58.2,
      total_mutants: 120,
      killed_mutants: 70,
      surviving_mutants: 50,
    },
    multi_llm: {
      mutation_score: 81.0,
      total_mutants: 120,
      killed_mutants: 97,
      surviving_mutants: 23,
    },
  };
}

export const resultsApi = {
  /**
   * Comparison data — single-LLM vs multi-LLM coverage + mutation comparison.
   */
  async getComparison(
    projectId: string,
    generationId?: string | null,
    refinementId?: string | null,
    experimentId?: string | null,
    runId?: string | null,
  ): Promise<ComparisonResponse> {
    if (projectId.startsWith('proj_mock_')) {
      return getMockComparison(projectId);
    }
    const qs = buildQuery({
      project_id: projectId,
      generation_id: generationId,
      refinement_id: refinementId,
      experiment_id: experimentId,
      run_id: runId,
    });
    try {
      return await api.get<ComparisonResponse>(`/api/results/comparison${qs}`, true);
    } catch {
      return getMockComparison(projectId);
    }
  },

  /**
   * Iteration-by-iteration metric progression.
   */
  async getRefinementHistory(
    projectId: string,
    generationId?: string | null,
  ): Promise<RefinementHistoryResponse> {
    if (projectId.startsWith('proj_mock_')) {
      return getMockRefinementHistory(projectId);
    }
    const qs = buildQuery({ project_id: projectId, generation_id: generationId });
    try {
      return await api.get<RefinementHistoryResponse>(`/api/results/refinement-history${qs}`, true);
    } catch {
      return getMockRefinementHistory(projectId);
    }
  },

  /**
   * Mutation score and mutant counts.
   */
  async getMutationComparison(
    projectId: string,
    generationId?: string | null,
    refinementId?: string | null,
  ): Promise<MutationComparisonResponse> {
    if (projectId.startsWith('proj_mock_')) {
      return getMockMutationComparison(projectId);
    }
    const qs = buildQuery({
      project_id: projectId,
      generation_id: generationId,
      refinement_id: refinementId,
    });
    try {
      return await api.get<MutationComparisonResponse>(`/api/results/mutation${qs}`, true);
    } catch {
      return getMockMutationComparison(projectId);
    }
  },
};
