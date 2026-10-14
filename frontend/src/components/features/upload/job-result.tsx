"use client";

import { useState } from "react";
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
// This makes previews and downloads work seamlessly across environments
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
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (!job?.output_url) return;
    const base = proxiedUrl(job.output_url);
    const downloadHref = `${base}${base.includes("?") ? "&" : "?"}download=true`;
    let targetFilename = job.output_filename || "document.pdf";
    if (!targetFilename.toLowerCase().endsWith(".pdf") && (toolName.includes("pdf") || base.includes(".pdf"))) {
      targetFilename = `${targetFilename}.pdf`;
    }

    try {
      setDownloading(true);
      const res = await fetch(downloadHref);
      if (!res.ok) throw new Error("Download request failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = targetFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      // Direct navigation fallback
      const a = document.createElement("a");
      a.href = downloadHref;
      a.download = targetFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

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
            <div className="mt-4 flex flex-col items-center">
              {job?.input_file_size_bytes != null ? (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Original:</span>
                    <span className="font-semibold text-foreground">
                      {formatBytes(job.input_file_size_bytes)}
                    </span>
                  </div>

                  <span className="text-muted-foreground/50">→</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">
                      {job.tool === "compress_pdf" ? "Compressed:" : "Output:"}
                    </span>
                    <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                      {formatBytes(job.output_size_bytes)}
                    </span>
                  </div>

                  {job.input_file_size_bytes > job.output_size_bytes && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400">
                      -{Math.round(((job.input_file_size_bytes - job.output_size_bytes) / job.input_file_size_bytes) * 100)}%
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Output size: {formatBytes(job.output_size_bytes)}
                </p>
              )}
            </div>
          )}

          {/* Output filename indicator */}
          {job?.output_filename && (
            <p
              className="mt-3 truncate max-w-xs sm:max-w-md mx-auto text-xs font-medium text-muted-foreground px-2"
              title={job.output_filename}
            >
              {job.output_filename}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {job?.output_url && (() => {
              const targetFilename = job.output_filename || "document.pdf";
              const ext = targetFilename.split(".").pop()?.toUpperCase() || "PDF";
              const label = ext === "PDF" ? "Download PDF" : `Download ${ext}`;

              return (
                <Button
                  size="lg"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="min-w-[160px] max-w-full px-6 shadow-sm cursor-pointer"
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4 shrink-0" />
                  )}
                  <span>{downloading ? "Downloading..." : label}</span>
                </Button>
              );
            })()}
            <Button variant="outline" size="lg" onClick={onReset} className="min-w-[150px]">
              <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
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
