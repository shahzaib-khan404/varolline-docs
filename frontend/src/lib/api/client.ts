/**
 * Axios API client — handles auth headers, token refresh, and error normalization.
 * All API calls go through this client so auth logic lives in one place.
 */

import axios, { AxiosError, type AxiosInstance } from "axios";

// Use relative base URL so API calls always go to the same origin as the page.
// Next.js rewrites proxy /api/v1/* → FastAPI.
const BASE_URL = "/api/v1";

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
    headers: { "Content-Type": "application/json" },
  });

  // Attach JWT from localStorage on every request
  client.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Normalize errors into a consistent shape
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ detail?: { code: string; message: string } }>) => {
      const detail = error.response?.data?.detail;

      // Auto-refresh on 401
      if (error.response?.status === 401 && typeof window !== "undefined") {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          try {
            const { data } = await axios.post(`/api/v1/auth/refresh`, {
              refresh_token: refreshToken,
            });
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
            // Retry original request
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${data.access_token}`;
              return client.request(error.config);
            }
          } catch {
            // Clear everything — tokens, Zustand persisted state, and the middleware cookie
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("ulovepdf-auth");
            document.cookie = "auth_token=; path=/; max-age=0";
            window.location.href = "/auth/login";
          }
        }
      }

      return Promise.reject(
        new ApiError(
          detail?.message ?? error.message ?? "An unexpected error occurred.",
          detail?.code ?? "UNKNOWN_ERROR",
          error.response?.status ?? 0
        )
      );
    }
  );

  return client;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = createApiClient();
