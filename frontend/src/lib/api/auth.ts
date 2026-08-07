/**
 * Auth API methods — used by React Query hooks and auth forms.
 */

import { apiClient } from "./client";
import type { TokenPair, UserRead } from "@/types/api";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<UserRead> => {
    const { data } = await apiClient.post<UserRead>("/auth/register", payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<TokenPair> => {
    const { data } = await apiClient.post<TokenPair>("/auth/login", payload);
    return data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  me: async (): Promise<UserRead> => {
    const { data } = await apiClient.get<UserRead>("/users/me");
    return data;
  },
};
