/**
 * mock/projects.ts — Centralized mock project data.
 *
 * Used as a fallback when the backend is unreachable or the user
 * has no valid JWT (mock-login scenario).
 *
 * Replace `mockProjectService` calls with real API calls once the
 * backend integration is complete — the data shape matches ProjectOut exactly.
 */

import type { Project, ProjectListResponse } from '../services/projectApi';

const MOCK_PROJECTS_KEY = 'testforge_mock_projects';

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_PROJECTS: Project[] = [
  {
    id: 'proj_mock_001',
    name: 'BankingSystemCore',
    description: 'Core banking transaction management system with JUnit 5 test generation.',
    language: 'java',
    java_version: '17',
    build_tool: 'Maven',
    status: 'ready',
    source_file_count: 12,
    latest_coverage: 84.3,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'proj_mock_002',
    name: 'InventoryManager',
    description: 'Inventory and stock management microservice for retail backend.',
    language: 'java',
    java_version: '21',
    build_tool: 'Gradle',
    status: 'completed',
    source_file_count: 8,
    latest_coverage: 91.6,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'proj_mock_003',
    name: 'OrderProcessingService',
    description: 'Multi-LLM chained test generation experiment for order lifecycle management.',
    language: 'java',
    java_version: '17',
    build_tool: 'Maven',
    status: 'analyzing',
    source_file_count: 5,
    latest_coverage: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

// ── Storage helpers ────────────────────────────────────────────────────────────

function loadMockProjects(): Project[] {
  try {
    const raw = localStorage.getItem(MOCK_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [...SEED_PROJECTS];
  } catch {
    return [...SEED_PROJECTS];
  }
}

function saveMockProjects(projects: Project[]): void {
  try {
    localStorage.setItem(MOCK_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // Ignore storage quota errors
  }
}

// ── Mock service ───────────────────────────────────────────────────────────────

export const mockProjectService = {
  async list(): Promise<ProjectListResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const projects = loadMockProjects();
    return { projects, total: projects.length };
  },

  async get(projectId: string): Promise<Project> {
    await new Promise((r) => setTimeout(r, 150));
    const projects = loadMockProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    return project;
  },

  async create(payload: {
    name: string;
    description?: string;
    language?: string;
    java_version?: string;
    build_tool?: string;
  }): Promise<Project> {
    await new Promise((r) => setTimeout(r, 300));
    const projects = loadMockProjects();
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj_mock_${Date.now()}`,
      name: payload.name,
      description: payload.description ?? null,
      language: payload.language ?? 'java',
      java_version: payload.java_version ?? '17',
      build_tool: payload.build_tool ?? 'Maven',
      status: 'draft',
      source_file_count: 0,
      latest_coverage: null,
      created_at: now,
      updated_at: now,
    };
    projects.push(newProject);
    saveMockProjects(projects);
    return newProject;
  },

  async update(projectId: string, payload: Partial<Project>): Promise<Project> {
    await new Promise((r) => setTimeout(r, 200));
    const projects = loadMockProjects();
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) throw new Error(`Project not found: ${projectId}`);
    projects[idx] = { ...projects[idx], ...payload, updated_at: new Date().toISOString() };
    saveMockProjects(projects);
    return projects[idx];
  },

  async delete(projectId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
    const projects = loadMockProjects();
    const filtered = projects.filter((p) => p.id !== projectId);
    saveMockProjects(filtered);
  },
};
