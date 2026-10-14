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

  uploadFromUrl: async (url: string, filename?: string): Promise<FileRead> => {
    const { data } = await apiClient.post<FileRead>("/files/upload-from-url", {
      url,
      filename,
    });
    return data;
  },

  previewPages: async (
    file: File,
    maxPages = 20
  ): Promise<{
    total_pages: number;
    previews: Array<{
      page_num: number;
      data_url: string;
      width: number;
      height: number;
      blocks?: Array<{
        id: string;
        type: "text" | "image";
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        fontSize?: number;
      }>;
    }>;
    has_fillable_fields?: boolean;
    native_fields?: Array<{
      id: string;
      page: number;
      name: string;
      type: "text" | "checkbox" | "signature" | "date";
      value: string;
      label?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      is_native?: boolean;
    }>;
  }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post("/files/preview-pages", form, {
      params: { max_pages: maxPages },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  detectFormFields: async (
    file: File
  ): Promise<{
    status: string;
    fields_count: number;
    fields: Array<{
      id: string;
      name: string;
      type: "text" | "checkbox" | "signature" | "date";
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      value: string | boolean;
      label?: string;
    }>;
  }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post("/files/detect-form-fields", form, {
      headers: { "Content-Type": "multipart/form-data" },
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
