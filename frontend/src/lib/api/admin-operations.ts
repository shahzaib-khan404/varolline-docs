/**
 * Admin Operations Management API client.
 */

import { apiClient } from "./client";

export interface OperationJobItem {
  id: string;
  tool: string;
  tool_name: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  output_filename: string;
  output_size_bytes: number;
  error_message: string | null;
  retry_count: number;
  created_at: string | null;
  updated_at: string | null;
  user: {
    id: string | null;
    email: string;
    full_name: string | null;
    role: string;
  } | null;
}

export interface OperationsStats {
  total_jobs: number;
  completed_jobs: number;
  processing_jobs: number;
  failed_jobs: number;
  success_rate: number;
  total_storage_bytes: number;
}

export interface AdminOperationsResponse {
  stats: OperationsStats;
  items: OperationJobItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const adminOperationsApi = {
  list: async (params?: {
    status?: string;
    tool?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdminOperationsResponse> => {
    const { data } = await apiClient.get<AdminOperationsResponse>("/admin/operations", {
      params,
    });
    return data;
  },

  delete: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/admin/operations/${jobId}`);
  },

  retry: async (jobId: string): Promise<void> => {
    await apiClient.post(`/admin/operations/${jobId}/retry`);
  },
};
