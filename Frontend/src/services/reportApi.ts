/**
 * reportApi.ts — Report generation API calls.
 */

import { api } from './api';

export interface ProjectReport {
  project: Record<string, unknown>;
  source_analysis: Record<string, unknown> | null;
  generation: Record<string, unknown>;
  test_results: Record<string, unknown>;
  coverage: Record<string, unknown>;
  mutation_testing: Record<string, unknown>;
}

export interface ExperimentReport {
  experiment: Record<string, unknown>;
  generation: Record<string, unknown>;
  coverage: Record<string, unknown>;
  test_results: Record<string, unknown>;
  mutation_testing: Record<string, unknown>;
}

export const reportApi = {
  getProjectReport(projectId: string): Promise<ProjectReport> {
    return api.get<ProjectReport>(`/api/projects/${projectId}/report`, true);
  },

  getExperimentReport(experimentId: string): Promise<ExperimentReport> {
    return api.get<ExperimentReport>(`/api/experiments/${experimentId}/report`, true);
  },
};
