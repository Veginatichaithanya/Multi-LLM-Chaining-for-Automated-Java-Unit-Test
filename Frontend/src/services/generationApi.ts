/**
 * generationApi.ts — Test generation API calls.
 */

import { api, AI_TIMEOUT_MS } from './api';

export interface GenerationResult {
  generation_id: string;
  project_id: string;
  source_id?: string | null;
  provider: string;
  model: string;
  framework: string;
  test_code: string | null;
  status: string;
  iteration?: number;
  prompt_tokens: number;
  completion_tokens: number;
  error_message: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface GenerationRequest {
  provider: string;
  model?: string;
  source_id: string;
  framework?: string;
}

export interface ChainRequest {
  initial_provider?: string;
  initial_model?: string;
  refinement_provider?: string;
  refinement_model?: string;
  source_id: string;
  framework?: string;
  max_iterations?: number;
}

export const generationApi = {
  generate(projectId: string, payload: GenerationRequest): Promise<GenerationResult> {
    return api.post<GenerationResult>(
      `/api/projects/${projectId}/generate-tests`,
      payload,
      true,
      AI_TIMEOUT_MS,
    );
  },

  chain(projectId: string, payload: ChainRequest): Promise<GenerationResult> {
    return api.post<GenerationResult>(
      `/api/projects/${projectId}/generate-tests/chain`,
      payload,
      true,
      AI_TIMEOUT_MS,
    );
  },

  listGenerations(projectId: string): Promise<GenerationResult[]> {
    return api.get<GenerationResult[]>(`/api/projects/${projectId}/generations`, true);
  },

  getGeneration(projectId: string, generationId: string): Promise<GenerationResult> {
    return api.get<GenerationResult>(`/api/projects/${projectId}/generations/${generationId}`, true);
  },
};

