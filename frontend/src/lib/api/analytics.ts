/**
 * Admin Traffic & Monitoring Analytics API client.
 */

import { apiClient } from "./client";

export interface AnalyticsSummary {
  total_visitors: number;
  total_pageviews: number;
  active_now: number;
  total_users: number;
  users_today: number;
  users_this_week: number;
  total_operations: number;
  operations_today: number;
  success_rate: number;
  avg_processing_time_s: number;
  ad_impressions: number;
  ad_clicks: number;
  ad_ctr: number;
}

export interface TrafficTrendPoint {
  date: string;
  visitors: number;
  pageviews: number;
  operations: number;
}

export interface TopToolMetric {
  tool: string;
  name: string;
  count: number;
  percentage: number;
}

export interface Demographics {
  devices: { label: string; percentage: number; visitors: number }[];
  browsers: { name: string; share: number }[];
  countries: { name: string; code: string; percentage: number }[];
}

export interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  provider: string;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  status: "success" | "info" | "ad" | "warning" | "error";
}

export interface AnalyticsOverview {
  summary: AnalyticsSummary;
  trends: TrafficTrendPoint[];
  top_tools: TopToolMetric[];
  demographics: Demographics;
  recent_users: RecentUser[];
  recent_activities: ActivityEvent[];
}

export const analyticsApi = {
  getOverview: async (days: number = 7): Promise<AnalyticsOverview> => {
    const { data } = await apiClient.get<AnalyticsOverview>(`/admin/analytics/overview?days=${days}`);
    return data;
  },
};
