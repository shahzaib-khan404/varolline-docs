"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Trash2,
  RotateCw,
  FileText,
  HardDrive,
  Layers,
  SlidersHorizontal,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  adminOperationsApi,
  type OperationJobItem,
  type AdminOperationsResponse,
} from "@/lib/api/admin-operations";
import { cn } from "@/lib/utils/cn";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AdminOperationsView() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useQuery<AdminOperationsResponse>({
    queryKey: ["admin-operations", page, selectedStatus, searchTerm],
    queryFn: () =>
      adminOperationsApi.list({
        page,
        page_size: 15,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        q: searchTerm.trim() || undefined,
      }),
    refetchInterval: 10000, // Auto-refresh every 10s
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => adminOperationsApi.delete(jobId),
    onSuccess: () => {
      toast({ title: "Operation Deleted", description: "Job removed from system records." });
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete operation." });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => adminOperationsApi.retry(jobId),
    onSuccess: () => {
      toast({ title: "Operation Queued", description: "Job reset to pending state for re-processing." });
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to retry operation." });
    },
  });

  const stats = data?.stats;
  const items = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Operations & Processing Engine
            </h1>
            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-500 border border-sky-500/20">
              Merged System View
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time tracking of all PDF operations, user conversions, processing queues, and storage footprint
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="self-start sm:self-auto gap-2 border-border/80 hover:bg-muted"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin text-primary")} />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Operations */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Operations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {stats ? stats.total_jobs.toLocaleString() : "—"}
            </span>
            <span className="text-xs font-medium text-emerald-500">Live DB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Platform-wide document conversions</p>
        </div>

        {/* Completed Successfully */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Completed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {stats ? stats.completed_jobs.toLocaleString() : "—"}
            </span>
            <span className="text-xs font-bold text-emerald-500">
              {stats ? `${stats.success_rate}% success` : "—"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Zero artifact corruption rate</p>
        </div>

        {/* In Queue / Processing */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active / Queued</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {stats ? stats.processing_jobs.toLocaleString() : "—"}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Async Worker</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Pending or running conversions</p>
        </div>

        {/* Output Storage */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Output Storage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {stats ? formatBytes(stats.total_storage_bytes) : "—"}
            </span>
            <span className="text-xs font-medium text-destructive">
              {stats && stats.failed_jobs > 0 ? `${stats.failed_jobs} failed` : "0 errors"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Auto-cleared every 24 hours</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by file, tool, or user email…"
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { label: "All Statuses", value: "all" },
            { label: "Completed", value: "completed" },
            { label: "Processing / Pending", value: "processing" },
            { label: "Failed", value: "failed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                selectedStatus === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Operations Table */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 font-semibold text-muted-foreground">
                <th className="py-3 px-4">Tool</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">User / Owner</th>
                <th className="py-3 px-4">Status & Progress</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading operations from database…</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">No operations found</p>
                    <p className="text-[11px] mt-0.5">Try clearing filters or search terms</p>
                  </td>
                </tr>
              ) : (
                items.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    {/* Tool */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 font-bold text-[10px]">
                          PDF
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{job.tool_name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                            {job.id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* File Name */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground truncate max-w-[180px]">
                        {job.output_filename}
                      </div>
                      {job.error_message && (
                        <div className="text-[10px] text-destructive truncate max-w-[180px]" title={job.error_message}>
                          {job.error_message}
                        </div>
                      )}
                    </td>

                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {job.user?.email.slice(0, 2).toUpperCase() || "GU"}
                        </div>
                        <div className="truncate max-w-[140px]">
                          <div className="text-foreground font-medium truncate">
                            {job.user ? job.user.email : "Guest User"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {job.user?.role === "admin" ? "Admin" : "Standard User"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status & Progress */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            job.status === "completed" && "bg-emerald-500/15 text-emerald-500",
                            job.status === "processing" && "bg-sky-500/15 text-sky-500 animate-pulse",
                            job.status === "pending" && "bg-amber-500/15 text-amber-500",
                            job.status === "failed" && "bg-destructive/15 text-destructive"
                          )}
                        >
                          {job.status === "completed" && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {job.status === "processing" && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                          {job.status === "failed" && <AlertCircle className="h-2.5 w-2.5" />}
                          {job.status}
                        </span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              job.status === "completed" ? "bg-emerald-500" : "bg-sky-500"
                            )}
                            style={{ width: `${job.progress || (job.status === "completed" ? 100 : 25)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {job.output_size_bytes > 0 ? formatBytes(job.output_size_bytes) : "—"}
                    </td>

                    {/* Created */}
                    <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                      {job.created_at ? new Date(job.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "—"}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(job.status === "failed" || job.status === "pending") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-sky-500 hover:bg-sky-500/10"
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                            title="Retry Operation"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(job.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">
              Page {page} of {totalPages} ({data?.total || 0} total jobs)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-7 px-2 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
