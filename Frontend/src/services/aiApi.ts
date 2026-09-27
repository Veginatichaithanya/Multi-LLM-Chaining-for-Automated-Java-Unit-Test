/**
 * aiApi.ts — AI provider API calls.
 *
 * SECURITY: Never puts API keys in frontend code.
 * All AI calls go through FastAPI which holds the keys.
 */

import { api } from './api';

export interface AIProviderStatus {
  provider: string;
  configured: boolean;
  status: string;
  note?: string;
}

export interface AIHealthResponse {
  openrouter: AIProviderStatus;
  gemini: AIProviderStatus;
  agentrouter: AIProviderStatus;
}

export interface AITestRequest {
  prompt: string;
  model?: string;
}

export interface AITestResponse {
  provider: string;
  model: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const aiApi = {
  /** Check which AI providers are configured and available. */
  getHealth(): Promise<AIHealthResponse> {
    return api.get<AIHealthResponse>('/api/ai/health', false);
  },

  /** Test OpenRouter with a prompt. Requires authentication. */
  testOpenRouter(payload: AITestRequest): Promise<AITestResponse> {
    return api.post<AITestResponse>('/api/ai/openrouter/test', payload, true);
  },

  /** Test Gemini with a prompt. Requires authentication. */
  testGemini(payload: AITestRequest): Promise<AITestResponse> {
    return api.post<AITestResponse>('/api/ai/gemini/test', payload, true);
  },

  /** Test AgentRouter connection. Requires authentication. */
  testAgentRouter(): Promise<{ provider: string; status: string; model?: string; response?: string; error_code?: string; message?: string }> {
    return api.post<{ provider: string; status: string; model?: string; response?: string; error_code?: string; message?: string }>('/api/ai/providers/agentrouter/test', {}, true);
  },
};
