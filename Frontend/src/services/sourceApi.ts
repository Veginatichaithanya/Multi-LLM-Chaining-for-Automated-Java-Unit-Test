/**
 * sourceApi.ts — Source code management and Phase 3 AST Analysis API calls.
 */

import { api } from './api';
import type { Phase3AnalysisResponse } from './types';

export interface SourceFile {
  id: string;
  project_id: string;
  file_name: string;
  language: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface SourceFileWithCode extends SourceFile {
  source_code: string;
}

export interface UploadSourcePayload {
  file_name: string;
  source_code: string;
}

export const sourceApi = {
  upload(projectId: string, payload: UploadSourcePayload): Promise<SourceFileWithCode> {
    return api.post<SourceFileWithCode>(`/api/projects/${projectId}/source`, payload, true);
  },

  list(projectId: string): Promise<SourceFile[]> {
    return api.get<SourceFile[]>(`/api/projects/${projectId}/source`, true);
  },

  get(projectId: string, sourceId: string): Promise<SourceFileWithCode> {
    return api.get<SourceFileWithCode>(`/api/projects/${projectId}/source/${sourceId}`, true);
  },

  delete(projectId: string, sourceId: string): Promise<void> {
    return api.del<void>(`/api/projects/${projectId}/source/${sourceId}`, true);
  },

  analyze(projectId: string, sourceId?: string): Promise<Phase3AnalysisResponse> {
    const payload = sourceId ? { source_id: sourceId } : {};
    return api.post<Phase3AnalysisResponse>(`/api/projects/${projectId}/analyze`, payload, true);
  },

  getAnalysis(projectId: string, sourceId: string): Promise<Phase3AnalysisResponse> {
    return api.get<Phase3AnalysisResponse>(`/api/projects/${projectId}/analysis/${sourceId}`, true);
  },
};


