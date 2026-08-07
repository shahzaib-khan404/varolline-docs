"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecentJobs } from "@/hooks/use-dashboard";
import { formatRelative, formatBytes } from "@/lib/utils/format";
import { TOOL_BY_ID } from "@/config/tools";
import { ToolIcon } from "@/components/ui/tool-icon";
import { PreviewDialog } from "@/components/features/upload/preview-dialog";
import type { JobRead, JobStatus } from "@/types/api";

const STATUS_BADGE: Record<JobStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  pending:    { label: "Pending",    variant: "secondary" },
  processing: { label: "Processing", variant: "warning"   },
  completed:  { label: "Done",       variant: "success"   },
  failed:     { label: "Failed",     variant: "destructive" },
  cancelled:  { label: "Cancelled",  variant: "outline"   },
};

function JobRow({ job }: { job: JobRead }) {
  const tool = TOOL_BY_ID[job.tool];
  const status = STATUS_BADGE[job.status];

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${tool?.color ?? "bg-muted"}`}
          >
            {tool && <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />}
          </span>
          <span className="truncate max-w-[140px] text-xs">
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
      <TableCell>
        {job.status === "processing" && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{job.progress}%</span>
          </div>
        )}
        {job.status !== "processing" && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatRelative(job.created_at)}
      </TableCell>
      <TableCell>
        {job.output_url && (
          <div className="flex items-center gap-1">
            <PreviewDialog
              url={job.output_url}
              filename={job.output_filename}
              outputSizeBytes={job.output_size_bytes}
              toolName={tool?.name ?? job.tool}
            />
            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
              <a href={job.output_url} download={job.output_filename ?? undefined}>
                <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
        {job.status === "failed" && (
          <span className="text-xs text-destructive truncate max-w-[120px]" title={job.error_message ?? ""}>
            {job.error_message?.slice(0, 30) ?? "Error"}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-3 w-20" /></TableCell>
          <TableCell><Skeleton className="h-3 w-16" /></TableCell>
          <TableCell><Skeleton className="h-7 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function RecentJobs() {
  const { data: jobs, isLoading, refetch, isFetching } = useRecentJobs(8);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
        <CardTitle className="text-sm font-semibold">Recent jobs</CardTitle>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href="/history">View all</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton />}
            {!isLoading && (!jobs || jobs.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No jobs yet. Pick a tool to get started.
                </TableCell>
              </TableRow>
            )}
            {jobs?.map((job) => <JobRow key={job.id} job={job} />)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
