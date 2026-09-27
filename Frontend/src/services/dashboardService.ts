/**
 * dashboardService.ts — Dashboard data API calls.
 *
 * Mirrors the shape of mock/dashboard.ts but calls the real API.
 * Falls back to mock data if the backend is unreachable so the
 * dashboard remains functional during frontend-only development.
 */

import type { DashboardData } from '../types/dashboard';
import { api, ApiError } from './api';
import { mockDashboardService } from '../mock/dashboard';

export const dashboardService = {
  /**
   * Fetch dashboard data.
   *
   * - Hits GET /dashboard when the backend is running.
   * - Falls back to the mock service when the backend is offline.
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      return await api.get<DashboardData>('/dashboard', true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Backend offline — use mock data transparently
        console.warn('[dashboardService] Backend unreachable — using mock dashboard data');
        return mockDashboardService.getDashboardData();
      }
      if (err instanceof ApiError && err.status === 404) {
        // Endpoint not yet implemented on backend — use mock
        return mockDashboardService.getDashboardData();
      }
      throw err;
    }
  },
};
