"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, Loader2, RefreshCw, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { jobsApi } from "@/lib/api/files";
import { formatRelative, formatBytes } from "@/lib/utils/format";
import { TOOL_BY_ID } from "@/config/tools";
import { ToolIcon } from "@/components/ui/tool-icon";
import { PreviewDialog } from "@/components/features/upload/preview-dialog";
import type { JobRead, JobStatus } from "@/types/api";

const STATUS_OPTIONS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Processing", value: "processing" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_BADGE: Record<JobStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  pending:    { label: "Pending",    variant: "secondary"  },
  processing: { label: "Processing", variant: "warning"    },
  completed:  { label: "Done",       variant: "success"    },
  failed:     { label: "Failed",     variant: "destructive" },
  cancelled:  { label: "Cancelled",  variant: "outline"    },
};

const MotionRow = motion(TableRow);

const PAGE_SIZE = 20;

export function HistoryPageClient() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["jobs-history", page, statusFilter],
    queryFn: () =>
      jobsApi.list({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    staleTime: 15_000,
  });

  const jobs = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const filtered = search.trim()
    ? jobs.filter((j) =>
        TOOL_BY_ID[j.tool]?.name.toLowerCase().includes(search.toLowerCase()) ||
        j.id.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tool or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-3 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-20" /></TableCell>
                  </TableRow>
                ))}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                    {statusFilter !== "all" || search
                      ? "No jobs match your filters."
                      : "No jobs yet. Pick a tool to get started."}
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((job, idx) => {
                const tool = TOOL_BY_ID[job.tool];
                const status = STATUS_BADGE[job.status];
                return (
                  <MotionRow
                    key={job.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-white ${tool?.color ?? "bg-muted"}`}>
                          {tool && <ToolIcon name={tool.icon} className="h-3 w-3" />}
                        </span>
                        <span className="truncate max-w-[150px] text-xs">
                          {tool?.name ?? job.tool}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant as any}>
                        {job.status === "processing" && (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.output_size_bytes ? formatBytes(job.output_size_bytes) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelative(job.created_at)}
                    </TableCell>
                    <TableCell>
                      {job.output_url ? (
                        <div className="flex items-center gap-1">
                          <PreviewDialog
                            url={job.output_url}
                            filename={job.output_filename}
                            outputSizeBytes={job.output_size_bytes}
                            toolName={tool?.name ?? job.tool}
                          />
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                            <a href={job.output_url} download={job.output_filename ?? undefined}>
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </a>
                          </Button>
                        </div>
                      ) : job.status === "failed" ? (
                        <span className="text-xs text-destructive truncate max-w-[110px]" title={job.error_message ?? ""}>
                          {job.error_message?.slice(0, 28) ?? "Error"}
                        </span>
                      ) : null}
                    </TableCell>
                  </MotionRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} — {data?.total ?? 0} jobs
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
