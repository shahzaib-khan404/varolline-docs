/**
 * Zustand auth store — persists tokens to localStorage and exposes
 * the current user. All auth actions go through this store so the
 * rest of the app has a single source of truth.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserRead } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserRead | null;

  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserRead) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens: (access, refresh) => {
        set({ accessToken: access, refreshToken: refresh });
        // Keep localStorage in sync for the Axios interceptor
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", access);
          localStorage.setItem("refresh_token", refresh);
        }
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      },

      isAuthenticated: () => Boolean(get().accessToken),
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "ulovepdf-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      // Persist tokens and user profile to prevent UI flashes on refresh
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
