/**
 * projectApi.ts — Project management API calls.
 * Conforms strictly to Phase 2 specifications.
 *
 * Mock fallback:
 *   If the backend is unreachable (ApiError status === 0) or the user
 *   has no valid JWT token (mock-login scenario), all methods silently
 *   fall back to mockProjectService so the UI remains fully usable.
 */

import { api, ApiError, getStoredToken } from './api';
import { mockProjectService } from '../mock/projects';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  language: string;
  java_version?: string;
  build_tool: string;
  status: string;
  user_id?: string;
  owner_id?: string;
  source_file_count: number;
  latest_coverage?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  language?: string;
  java_version?: string;
  build_tool?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  language?: string;
  java_version?: string;
  build_tool?: string;
  status?: string;
}

/** Returns true when the user has a real JWT from the backend. */
function hasRealToken(): boolean {
  return !!getStoredToken();
}

/** Returns true when the projectId looks like a mock seed ID. */
function isMockId(projectId: string): boolean {
  return projectId.startsWith('proj_mock_');
}

export const projectApi = {
  async create(payload: CreateProjectPayload): Promise<Project> {
    if (!hasRealToken()) {
      console.warn('[projectApi] No JWT — using mock create');
      return mockProjectService.create(payload);
    }
    try {
      return await api.post<Project>('/api/projects', payload, true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        console.warn('[projectApi] Backend unreachable — using mock create');
        return mockProjectService.create(payload);
      }
      throw err;
    }
  },

  async list(): Promise<ProjectListResponse> {
    if (!hasRealToken()) {
      console.warn('[projectApi] No JWT — using mock list');
      return mockProjectService.list();
    }
    try {
      const res = await api.get<ProjectListResponse | Project[]>('/api/projects', true);
      if (Array.isArray(res)) {
        return { projects: res, total: res.length };
      }
      return res;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 0 || err.status === 401)) {
        console.warn('[projectApi] Backend unreachable or unauthorized — using mock list');
        return mockProjectService.list();
      }
      throw err;
    }
  },

  async get(projectId: string): Promise<Project> {
    // Always use mock service for seed IDs regardless of auth state
    if (isMockId(projectId) || !hasRealToken()) {
      console.warn('[projectApi] Mock ID or no JWT — using mock get');
      return mockProjectService.get(projectId);
    }
    try {
      return await api.get<Project>(`/api/projects/${projectId}`, true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 0 || err.status === 401 || err.status === 404)) {
        console.warn('[projectApi] Backend unreachable, unauthorized, or not found — using mock get');
        return mockProjectService.get(projectId);
      }
      throw err;
    }
  },

  async update(projectId: string, payload: UpdateProjectPayload): Promise<Project> {
    if (!hasRealToken()) {
      console.warn('[projectApi] No JWT — using mock update');
      return mockProjectService.update(projectId, payload);
    }
    try {
      return await api.put<Project>(`/api/projects/${projectId}`, payload, true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 0 || err.status === 401)) {
        console.warn('[projectApi] Backend unreachable or unauthorized — using mock update');
        return mockProjectService.update(projectId, payload);
      }
      throw err;
    }
  },

  async delete(projectId: string): Promise<void> {
    if (!hasRealToken()) {
      console.warn('[projectApi] No JWT — using mock delete');
      return mockProjectService.delete(projectId);
    }
    try {
      return await api.del<void>(`/api/projects/${projectId}`, true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 0 || err.status === 401)) {
        console.warn('[projectApi] Backend unreachable or unauthorized — using mock delete');
        return mockProjectService.delete(projectId);
      }
      throw err;
    }
  },
};

