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

export const resultsApi = {
  /**
   * Fig. 3 data — single-LLM vs multi-LLM coverage + mutation comparison.
   */
  getComparison(
    projectId: string,
    generationId?: string | null,
    refinementId?: string | null,
    experimentId?: string | null,
    runId?: string | null,
  ): Promise<ComparisonResponse> {
    const qs = buildQuery({
      project_id: projectId,
      generation_id: generationId,
      refinement_id: refinementId,
      experiment_id: experimentId,
      run_id: runId,
    });
    return api.get<ComparisonResponse>(`/api/results/comparison${qs}`, true);
  },

  /**
   * Fig. 4 data — iteration-by-iteration metric progression.
   */
  getRefinementHistory(
    projectId: string,
    generationId?: string | null,
  ): Promise<RefinementHistoryResponse> {
    const qs = buildQuery({ project_id: projectId, generation_id: generationId });
    return api.get<RefinementHistoryResponse>(`/api/results/refinement-history${qs}`, true);
  },

  /**
   * Fig. 5 data — mutation score and mutant counts.
   */
  getMutationComparison(
    projectId: string,
    generationId?: string | null,
    refinementId?: string | null,
  ): Promise<MutationComparisonResponse> {
    const qs = buildQuery({
      project_id: projectId,
      generation_id: generationId,
      refinement_id: refinementId,
    });
    return api.get<MutationComparisonResponse>(`/api/results/mutation${qs}`, true);
  },
};
