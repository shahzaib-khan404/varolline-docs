/**
 * File upload API methods.
 */

import { apiClient } from "./client";
import type { FileRead, JobRead, PaginatedResponse } from "@/types/api";

export const filesApi = {
  upload: async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<FileRead> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<FileRead>("/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return data;
  },
};

export const jobsApi = {
  create: async (payload: {
    tool: string;
    input_file_id: string;
    options?: Record<string, unknown>;
  }): Promise<JobRead> => {
    const { data } = await apiClient.post<JobRead>("/jobs", payload);
    return data;
  },

  get: async (jobId: string): Promise<JobRead> => {
    const { data } = await apiClient.get<JobRead>(`/jobs/${jobId}`);
    return data;
  },

  list: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<JobRead>> => {
    const { data } = await apiClient.get<PaginatedResponse<JobRead>>("/jobs", { params });
    return data;
  },
};
