export interface DashboardSummary {
  projectsCount: string;
  testRunsCount: string;
  experimentsCount: string;
  reportsCount: string;
}

export interface PipelineStep {
  id: string;
  label: string;
  stepNumber: number;
  category: 'source' | 'analysis' | 'gemini' | 'junit' | 'validation' | 'jacoco' | 'openai' | 'output';
  description: string;
}

export interface ResearchConfigModel {
  id: string;
  type: 'single' | 'multi';
  title: string;
  models: string[];
  status: string;
  description: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentProjects: never[];
  recentActivity: never[];
  pipelineSteps: PipelineStep[];
  researchConfigs: ResearchConfigModel[];
}
