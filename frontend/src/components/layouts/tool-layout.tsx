"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ToolIcon } from "@/components/ui/tool-icon";
import { UploadZone } from "@/components/features/upload/upload-zone";
import { JobResult } from "@/components/features/upload/job-result";
import { useUpload } from "@/hooks/use-upload";
import { jobsApi } from "@/lib/api/files";
import { AdBannerSlot } from "@/components/features/ads/ad-banner-slot";
import type { ToolConfig } from "@/config/tools";
import type { FileRead } from "@/types/api";

export interface JobPayload {
  input_file_id: string;
  options?: Record<string, unknown>;
}

export interface ToolLayoutProps {
  tool: ToolConfig;
  children?: React.ReactNode | ((upload: ReturnType<typeof useUpload>) => React.ReactNode);
  /**
   * When true, collects all uploaded files as:
   *   input_file_id = files[0].id
   *   options.additional_file_ids = [files[1].id, ...]
   */
  multiFile?: boolean;
  /**
   * Override the full job payload at submit time.
   * Only safe to pass from other CLIENT components — not across the RSC boundary.
   * Takes precedence over `multiFile`.
   */
  getJobOptions?: (files: FileRead[]) => JobPayload;
  actionLabel?: React.ReactNode;
  actionClassName?: string;
  upload?: ReturnType<typeof useUpload>;
}

export function ToolLayout({
  tool,
  children,
  multiFile = false,
  getJobOptions,
  actionLabel,
  actionClassName,
  upload: externalUpload,
}: ToolLayoutProps) {
  const internalUpload = useUpload();
  const upload = externalUpload ?? internalUpload;
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleProcess = async () => {
    setServerError(null);
    setProcessing(true);
    try {
      const files = await upload.uploadAll();
      const succeeded = files.filter(Boolean);
      if (!succeeded.length) {
        setServerError("No files were uploaded successfully. Please check the errors above.");
        return;
      }

      const [first, ...rest] = succeeded as [typeof succeeded[0], ...typeof succeeded];
      const payload: JobPayload = getJobOptions
        ? getJobOptions(succeeded)
        : multiFile && rest.length
          ? {
              input_file_id: first.id,
              options: { additional_file_ids: rest.map((f) => f.id) },
            }
          : { input_file_id: first.id };

      const job = await jobsApi.create({ tool: tool.id, ...payload });
      setJobId(job.id);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.detail ??
        (err as any)?.response?.data?.message ??
        (err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setServerError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setServerError(null);
    upload.clear();
  };

  const canProcess =
    upload.items.length > 0 &&
    !upload.isUploading &&
    !processing &&
    !upload.items.every((it) => it.status === "uploading");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Slot #3: Top Leaderboard (Up) */}
      <AdBannerSlot slotNumber={3} className="mb-8" />

      {/* Main 3-Column Layout: Left Ad #1 | Center Tool Workspace | Right Ad #2 */}
      <div className="flex justify-center items-start gap-6 xl:gap-8 w-full">
        {/* Slot #1: Left Skyscraper (Left) */}
        <AdBannerSlot
          slotNumber={1}
          orientation="vertical"
          className="hidden lg:flex w-[180px] xl:w-[220px] shrink-0 sticky top-24"
        />

        {/* Center: Tool Workspace */}
        <div className="w-full max-w-2xl min-w-0 flex-1">
          {/* Back link */}
          <Link
            href="/tools"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All tools
          </Link>

          {/* Heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tool.color}`}
              >
                <ToolIcon name={tool.icon} className="h-5 w-5 text-white" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{tool.name}</h1>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </div>
          </div>

      <AnimatePresence mode="wait">
        {jobId ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <JobResult jobId={jobId} toolName={tool.name} onReset={handleReset} />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Upload zone */}
            <UploadZone tool={tool} {...upload} />

            {/* Tool-specific options — shown after files are selected */}
            <AnimatePresence>
              {children && upload.items.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl border bg-card p-4"
                >
                  {typeof children === "function" ? children(upload) : children}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Server error */}
            <AnimatePresence>
              {serverError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
                >
                  {serverError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Action area */}
            {upload.items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                    size="lg"
                    className={cn("w-full", actionClassName)}
                    disabled={!canProcess}
                    onClick={handleProcess}
                  >
                    {processing || upload.isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {upload.isUploading ? "Uploading…" : "Starting…"}
                      </>
                    ) : (
                      actionLabel ?? tool.name
                    )}
                  </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

          {/* Slot #4: Bottom Anchor (Down) */}
          <AdBannerSlot slotNumber={4} className="mt-8" />
        </div>

        {/* Slot #2: Right Skyscraper (Right) */}
        <AdBannerSlot
          slotNumber={2}
          orientation="vertical"
          className="hidden lg:flex w-[180px] xl:w-[220px] shrink-0 sticky top-24"
        />
      </div>
    </div>
  );
}

