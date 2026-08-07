"use client";

import { motion } from "framer-motion";
import {
  FileText, Image as ImageIcon, File, CheckCircle2,
  AlertCircle, X, RotateCcw, Loader2,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/format";
import type { UploadItem } from "@/hooks/use-upload";

function FileIcon({ mime }: { mime: string }) {
  if (mime === "application/pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  if (mime.startsWith("image/"))
    return <ImageIcon className="h-5 w-5 text-green-500" />;
  if (mime.includes("word") || mime.includes("document"))
    return <FileText className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

interface FileItemProps {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

export function FileItem({ item, index, onRemove, onRetry }: FileItemProps) {
  const { id, file, status, progress, error } = item;
  const isUploading = status === "uploading";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        isError ? "border-destructive/40 bg-destructive/5" : "bg-card"
      }`}
    >
      {/* File icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileIcon mime={file.type} />
      </div>

      {/* Name + size + progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium">{file.name}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.15 }}
            />
          </div>
        )}

        {isError && (
          <p className="mt-0.5 truncate text-[10px] text-destructive">{error}</p>
        )}

        {!isUploading && !isError && (
          <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">
            {status === "idle" ? "Ready" : "Uploaded"}
          </p>
        )}
      </div>

      {/* Right status icon */}
      <div className="shrink-0">
        {isUploading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {isDone && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        {isError && (
          <button
            onClick={() => onRetry(id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Retry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {(status === "idle" || isError) && !isUploading && (
          <button
            onClick={() => onRemove(id)}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
