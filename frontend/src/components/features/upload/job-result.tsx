"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2, AlertCircle, Download, RotateCcw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobsApi } from "@/lib/api/files";
import { formatBytes } from "@/lib/utils/format";
import { ResultPreview } from "./result-preview";
import type { JobStatus } from "@/types/api";

const POLL_INTERVAL = 2000;

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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-none border border-border bg-card/60 backdrop-blur-md p-6 sm:p-8"
    >
      {isRunning && (
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-sky-500/10 border border-sky-500/20">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600 dark:text-sky-400" />
          </div>
          <p className="mt-4 text-base font-bold text-foreground">Processing document…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Asynchronous workers are executing your request.
          </p>
        </div>
      )}

      {isDone && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Task Completed</h2>
              <p className="text-xs text-muted-foreground">
                Your file is ready for download.
              </p>
            </div>
          </div>

          {job?.output_url && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-none border border-border bg-background/60">
              <div className="truncate">
                <p className="text-xs font-semibold text-foreground truncate">
                  {job.output_filename || "output.pdf"}
                </p>
                {job.output_size_bytes && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(job.output_size_bytes)}
                  </p>
                )}
              </div>
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-none bg-sky-600 hover:bg-sky-700 text-white min-h-[44px]"
              >
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading…
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </>
                )}
              </Button>
            </div>
          )}

          {job?.output_url && (
            <ResultPreview url={proxiedUrl(job.output_url)} filename={job.output_filename || "document.pdf"} />
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onReset} className="rounded-none text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Process another file
            </Button>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-bold text-foreground">Processing Failed</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
            {job?.error_message || "An error occurred while processing the file. Please verify the document format."}
          </p>
          <Button variant="outline" onClick={onReset} className="mt-5 rounded-none text-xs">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      )}
    </motion.div>
  );
}
