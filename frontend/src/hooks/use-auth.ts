"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  return () => {
    authApi.logout();
    logout();
    queryClient.clear();
  };
}
