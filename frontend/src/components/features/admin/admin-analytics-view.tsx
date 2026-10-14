"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Eye,
  Activity,
  FileCheck2,
  TrendingUp,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  Globe2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Megaphone,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { analyticsApi, type AnalyticsOverview } from "@/lib/api/analytics";
import { cn } from "@/lib/utils/cn";

export function AdminAnalyticsView() {
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AnalyticsOverview>({
    queryKey: ["admin-analytics", rangeDays],
    queryFn: () => analyticsApi.getOverview(rangeDays),
    refetchInterval: 5000, // Live poll every 5s for real-time monitoring
    refetchIntervalInBackground: true,
  });

  const summary = data?.summary;
  const trends = data?.trends || [];
  const topTools = data?.top_tools || [];
  const demographics = data?.demographics;
  const recentUsers = data?.recent_users || [];
  const recentActivities = data?.recent_activities || [];

  // Chart computation for SVG
  const maxVisitors = Math.max(...trends.map((t) => t.visitors), 100);
  const chartHeight = 160;
  const chartWidth = 600;

  const points = trends.map((t, idx) => {
    const x = (idx / Math.max(trends.length - 1, 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (t.visitors / maxVisitors) * (chartHeight - 40) - 20;
    return { x, y, ...t };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaD =
    points.length > 0 && firstPoint && lastPoint
      ? `${pathD} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`
      : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Traffic & Real-time Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Monitoring
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Monitor real-time visitors, document conversion throughput, audience technology, and registered user growth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center rounded-xl border border-border/80 bg-card p-1 shadow-sm">
            {[
              { label: "24h", days: 1 },
              { label: "7 Days", days: 7 },
              { label: "30 Days", days: 30 },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => setRangeDays(btn.days)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  rangeDays === btn.days
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isRefetching || isLoading) && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Live Active Users */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Right Now</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {summary ? summary.active_now : "—"}
            </span>
            <span className="text-xs font-medium text-emerald-500 flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
              Online now
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Current concurrent users across tools & landing
          </p>
        </div>

        {/* Card 2: Total Unique Visitors */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Unique Visitors</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {summary ? summary.total_visitors.toLocaleString() : "—"}
            </span>
            <span className="text-xs font-medium text-emerald-500 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              Live DB
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            In selected period ({rangeDays} days)
          </p>
        </div>

        {/* Card 3: Total Pageviews */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Pageviews</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {summary ? summary.total_pageviews.toLocaleString() : "—"}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {summary && summary.total_visitors > 0
                ? `~${(summary.total_pageviews / summary.total_visitors).toFixed(1)} views/user`
                : "—"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Fast response times with zero layout shifts
          </p>
        </div>

        {/* Card 4: Operations Processed */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Documents Processed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {summary ? summary.total_operations.toLocaleString() : "—"}
            </span>
            <span className="text-xs font-medium text-emerald-500">
              {summary ? `${summary.success_rate}% success` : "—"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Avg speed: {summary && summary.avg_processing_time_s > 0 ? `${summary.avg_processing_time_s}s` : "< 1.0s"} per file
          </p>
        </div>
      </div>

      {/* Interactive Traffic Trends SVG Chart */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-md shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Visitor Traffic Trend
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily visitors and document processing volume over the last {rangeDays} days
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span>Unique Visitors</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>Pageviews</span>
            </div>
          </div>
        </div>

        {/* SVG Curve Display */}
        <div className="relative w-full overflow-hidden pt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
            <line x1="0" y1="70" x2={chartWidth} y2="70" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />

            {/* Area Fill */}
            {areaD && <path d={areaD} fill="url(#visitorGradient)" />}

            {/* Primary Curve Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Points */}
            {points.map((pt, i) => (
              <g key={pt.date}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === i ? 6 : 4}
                  fill="#ffffff"
                  stroke="#0ea5e9"
                  strokeWidth="2.5"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            ))}
          </svg>

          {/* Dates row below chart */}
          <div className="mt-2 flex justify-between px-2 text-[10px] text-muted-foreground font-mono">
            {trends.map((t, idx) => (
              <span key={t.date} className={idx % 2 !== 0 && trends.length > 10 ? "hidden sm:inline" : ""}>
                {t.date}
              </span>
            ))}
          </div>

          {/* Floating Tooltip if hovering a node */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="pointer-events-none absolute top-4 z-20 -translate-x-1/2 rounded-xl border border-border bg-popover/95 p-2.5 shadow-xl backdrop-blur-md text-xs"
              style={{
                left: `${(hoveredIndex / Math.max(points.length - 1, 1)) * 92 + 4}%`,
              }}
            >
              <div className="font-semibold text-foreground">{points[hoveredIndex].date}</div>
              <div className="mt-1 space-y-0.5 text-[11px]">
                <div className="text-sky-500 font-medium">
                  {points[hoveredIndex].visitors.toLocaleString()} Visitors
                </div>
                <div className="text-muted-foreground">
                  {points[hoveredIndex].pageviews.toLocaleString()} Pageviews
                </div>
                <div className="text-emerald-500">
                  {points[hoveredIndex].operations.toLocaleString()} Document Ops
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Columns: Top Tools & Demographics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Tools by Volume */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Top Visited Tools
              </h2>
              <p className="text-xs text-muted-foreground">
                Document conversion volume by tool
              </p>
            </div>
            <Link
              href="/tools"
              target="_blank"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All Tools <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {topTools.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No tool executions recorded yet. Run any PDF tool to see real volume distribution.
              </div>
            ) : (
              topTools.map((t) => (
                <div key={t.tool} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-foreground">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {t.count.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({t.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${Math.min(t.percentage * 2.2, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audience Devices & Geography */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-md shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Audience & Technology
            </h2>
            <p className="text-xs text-muted-foreground">
              Device types, top browsers, and geographic distribution
            </p>
          </div>

          {/* Device types */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Device Breakdown
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {(demographics?.devices || [
                { label: "Desktop", percentage: 100 },
                { label: "Mobile", percentage: 0 },
                { label: "Tablet", percentage: 0 },
              ]).map((d) => {
                const Icon = d.label === "Desktop" ? Monitor : d.label === "Mobile" ? Smartphone : Tablet;
                return (
                  <div key={d.label} className="rounded-xl border border-border/70 bg-muted/30 p-3 text-center">
                    <Icon className="h-4 w-4 mx-auto text-sky-500 mb-1" />
                    <div className="text-xs font-bold text-foreground">{d.label}</div>
                    <div className="text-sm font-extrabold text-primary">{d.percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Browsers */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Top Browsers
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {demographics?.browsers.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5"
                >
                  <span className="text-muted-foreground">{b.name}</span>
                  <span className="font-semibold text-foreground">{b.share}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Countries */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Top Regions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {demographics?.countries.map((c) => (
                <span
                  key={c.code}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-[11px] font-medium"
                >
                  <Globe2 className="h-3 w-3 text-muted-foreground" />
                  <span>{c.name}</span>
                  <span className="font-bold text-foreground">{c.percentage}%</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Activity Feed & Recent Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Real-time Activity Stream */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Real-time Activity Stream
              </h2>
              <p className="text-xs text-muted-foreground">
                Live document processing events from database
              </p>
            </div>
            <Link
              href="/admin/operations"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View All Operations</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent activity recorded
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs",
                      act.status === "success" && "bg-emerald-500/10 text-emerald-500",
                      act.status === "info" && "bg-sky-500/10 text-sky-500",
                      act.status === "error" && "bg-destructive/10 text-destructive",
                      act.status === "ad" && "bg-amber-500/10 text-amber-500"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {act.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Registered Users */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Recent Registered Accounts
              </h2>
              <p className="text-xs text-muted-foreground">
                Live user accounts linked with database
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Manage All ({summary?.total_users ?? 0})</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentUsers.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {u.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {u.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      via {u.provider}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      u.role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AdSense Quick Action Callout */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-cyan-500/5 to-transparent p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Company AdSense & Banner Slots Management
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage banner slots #1 through #7, upload product pictures or video campaigns, and configure destination click links.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link href="/admin/ads">
            <span>Manage Ad Slots & Upload</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
