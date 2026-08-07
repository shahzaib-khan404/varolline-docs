"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { jobsApi } from "@/lib/api/files";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.stats,
    staleTime: 30_000,
  });
}

export function useRecentJobs(limit = 8) {
  return useQuery({
    queryKey: ["jobs", "recent", limit],
    queryFn: async () => {
      const res = await jobsApi.list({ page: 1, page_size: limit });
      return res.items;
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}
