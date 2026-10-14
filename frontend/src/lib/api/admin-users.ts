/**
 * Admin User Management API client.
 */

import { apiClient } from "./client";

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  is_active: boolean;
  is_verified: boolean;
  provider: string;
  jobs_count: number;
  created_at: string | null;
  is_current_admin: boolean;
}

export interface AdminUsersResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const adminUsersApi = {
  list: async (params?: {
    q?: string;
    role?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdminUsersResponse> => {
    const { data } = await apiClient.get<AdminUsersResponse>("/admin/users", {
      params,
    });
    return data;
  },

  updateRole: async (userId: string, role: "admin" | "user"): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/role`, { role });
  },

  updateStatus: async (userId: string, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/status`, { is_active: isActive });
  },

  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  delete: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },
};
