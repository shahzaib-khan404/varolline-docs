import { apiClient } from "./client";

export interface DashboardStats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
  total_files: number;
  jobs_by_tool: Record<string, number>;
}

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>("/dashboard/stats");
    return data;
  },
};
