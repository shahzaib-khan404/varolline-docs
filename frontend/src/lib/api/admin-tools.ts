/**
 * Admin Tools Management API client.
 */

import { apiClient } from "./client";

export interface AdminToolItem {
  id: string;
  name: string;
  category: "organize" | "optimize" | "convert" | "security";
  description: string;
  route: string;
  status: "operational" | "maintenance" | "disabled";
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  success_rate: number;
}

export interface AdminToolsResponse {
  tools: AdminToolItem[];
  total_tools: number;
  total_platform_runs: number;
  engine_status: string;
}

export const adminToolsApi = {
  list: async (): Promise<AdminToolsResponse> => {
    const { data } = await apiClient.get<AdminToolsResponse>("/admin/tools");
    return data;
  },
};
