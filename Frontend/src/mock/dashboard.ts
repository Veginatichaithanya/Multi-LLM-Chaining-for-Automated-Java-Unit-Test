import type { DashboardData } from '../types/dashboard';


/**
 * Mock Dashboard Data Service.
 * Separated from UI components so it can easily be replaced with
 * `api.getDashboard()` in Phase 2 without rewriting the dashboard UI.
 */
export const mockDashboardService = {
  getDashboardData: async (): Promise<DashboardData> => {
    // Simulate brief asynchronous fetch
    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      summary: {
        projectsCount: '--',
        testRunsCount: '--',
        experimentsCount: '--',
        reportsCount: '--',
      },
      recentProjects: [],
      recentActivity: [],
      pipelineSteps: [
        {
          id: 'step-1',
          stepNumber: 1,
          label: 'Java Source',
          category: 'source',
          description: 'Input Java classes, signatures, and domain dependencies',
        },
        {
          id: 'step-2',
          stepNumber: 2,
          label: 'Code Analysis',
          category: 'analysis',
          description: 'AST parsing, control flow graph & branch condition extraction',
        },
        {
          id: 'step-3',
          stepNumber: 3,
          label: 'Gemini',
          category: 'gemini',
          description: 'Initial structural test generation (Google Gemini 1.5 Flash)',
        },
        {
          id: 'step-4',
          stepNumber: 4,
          label: 'JUnit Tests',
          category: 'junit',
          description: 'Compiled JUnit 5 test suite with assertions',
        },
        {
          id: 'step-5',
          stepNumber: 5,
          label: 'Validation',
          category: 'validation',
          description: 'Automated build verification & runtime failure capture',
        },
        {
          id: 'step-6',
          stepNumber: 6,
          label: 'JaCoCo',
          category: 'jacoco',
          description: 'Line, branch, and instruction coverage analysis',
        },
        {
          id: 'step-7',
          stepNumber: 7,
          label: 'OpenAI Refinement',
          category: 'openai',
          description: 'Targeted boundary & edge-case patch refinement (GPT-4o)',
        },
        {
          id: 'step-8',
          stepNumber: 8,
          label: 'Final Tests',
          category: 'output',
          description: 'Verified test suite ready for CI/CD integration',
        },
      ],
      researchConfigs: [
        {
          id: 'cfg-gemini-single',
          type: 'single',
          title: 'Single LLM',
          models: ['Gemini'],
          status: 'Ready for experiments',
          description: 'Baseline generation utilizing Google Gemini 1.5 Flash',
        },
        {
          id: 'cfg-openai-single',
          type: 'single',
          title: 'Single LLM',
          models: ['OpenAI'],
          status: 'Ready for experiments',
          description: 'Baseline generation utilizing OpenAI GPT-4o',
        },
        {
          id: 'cfg-multi-chained',
          type: 'multi',
          title: 'Multi-LLM',
          models: ['Gemini', 'OpenAI'],
          status: 'Ready for experiments',
          description: 'Iterative chaining: Gemini initial draft → JaCoCo feedback → OpenAI refinement',
        },
      ],
    };
  },
};
