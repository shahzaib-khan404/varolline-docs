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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`flex items-center gap-3 rounded-none border p-3 transition-colors ${
        isError ? "border-destructive/40 bg-destructive/5" : "border-border/80 bg-card/60 backdrop-blur-md"
      }`}
    >
      {/* File icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-muted border border-border">
        <FileIcon mime={file.type} />
      </div>

      {/* Name + size + progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </div>

        {isUploading && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-none bg-muted">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{progress}%</span>
          </div>
        )}

        {isError && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">{error || "Upload failed"}</span>
          </p>
        )}
      </div>

      {/* Action button */}
      <div className="flex shrink-0 items-center gap-1">
        {isUploading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {isDone && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        {isError && (
          <button
            onClick={() => onRetry(id)}
            className="flex h-6 w-6 items-center justify-center rounded-none text-muted-foreground transition-colors hover:text-foreground"
            title="Retry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onRemove(id)}
          className="flex h-6 w-6 items-center justify-center rounded-none text-muted-foreground transition-colors hover:text-destructive"
          title="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
