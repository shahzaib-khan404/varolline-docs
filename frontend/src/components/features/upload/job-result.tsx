"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2, AlertCircle, Clock, Download, RotateCcw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobsApi } from "@/lib/api/files";
import { formatBytes } from "@/lib/utils/format";
import { ResultPreview } from "./result-preview";
import type { JobStatus } from "@/types/api";

const POLL_INTERVAL = 2000; // 2s while job is running

// Strip the backend origin so file URLs go through the Next.js /uploads/* proxy.
// This makes previews and downloads work on any public URL (ngrok, production, etc.)
// without needing direct access to the backend server.
function proxiedUrl(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    return pathname + search;
  } catch {
    return url;
  }
}

function shouldPoll(status: JobStatus | undefined): boolean {
  return status === "pending" || status === "processing";
}

interface JobResultProps {
  jobId: string;
  toolName: string;
  onReset: () => void;
}

export function JobResult({ jobId, toolName, onReset }: JobResultProps) {
  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobsApi.get(jobId),
    refetchInterval: (query) =>
      shouldPoll(query.state.data?.status) ? POLL_INTERVAL : false,
  });

  const status = job?.status;
  const isRunning = !status || shouldPoll(status);
  const isDone = status === "completed";
  const isFailed = status === "failed" || status === "cancelled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border bg-card p-8"
    >
      {isRunning && (
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="mt-4 text-sm font-semibold">
            {status === "processing" ? "Processing your file…" : "Queued, waiting to start…"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">This usually takes a few seconds.</p>

          {status === "processing" && job?.progress !== undefined && (
            <div className="mt-4 w-48">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${job.progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{job.progress}%</p>
            </div>
          )}
        </div>
      )}

      {isDone && (
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="mt-4 text-sm font-semibold">Done! Your file is ready.</p>
          <p className="mt-1 text-xs text-muted-foreground">{toolName} completed successfully.</p>

          {job?.output_size_bytes != null && (
            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Output size: {formatBytes(job.output_size_bytes)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {job?.output_url && (
              <Button asChild size="lg">
                <a href={proxiedUrl(job.output_url)} download={job.output_filename ?? undefined}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                  {job.output_filename ? ` "${job.output_filename}"` : ""}
                </a>
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={onReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Process another
            </Button>
          </div>

          {job?.output_url && (
            <div className="w-full">
              <ResultPreview url={proxiedUrl(job.output_url)} filename={job.output_filename} />
            </div>
          )}
        </div>
      )}

      {isFailed && (
        <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="mt-4 text-sm font-semibold text-destructive">Processing failed</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {job?.error_message ?? "Something went wrong. Please try again."}
          </p>
          <Button variant="outline" className="mt-6" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      )}
    </motion.div>
  );
}
