"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ToolConfig } from "@/config/tools";

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

const MIME_EXTENSIONS_MAP: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/html": [".html", ".htm"],
  "text/plain": [".txt"],
};

function buildAccept(mimeTypes: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const mime of mimeTypes) {
    map[mime] = MIME_EXTENSIONS_MAP[mime] ?? [];
  }
  return map;
}

function formatMimes(types: string[]): string {
  const labels: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.ms-excel": "XLS",
    "text/csv": "CSV",
    "text/html": "HTML",
    "text/plain": "TXT",
  };
  return types.map((t) => labels[t] ?? t.split("/")[1]?.toUpperCase() ?? t).join(", ");
}

interface DropzoneProps {
  tool: ToolConfig;
  hasFiles: boolean;
  onDrop: (files: File[]) => void;
}

export function Dropzone({ tool, hasFiles, onDrop }: DropzoneProps) {
  const { toast } = useToast();

  const onDropAccepted = useCallback(
    (files: File[]) => onDrop(files),
    [onDrop]
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      const msgs = new Set<string>();
      for (const { errors } of rejections) {
        for (const e of errors) {
          if (e.code === "file-too-large") msgs.add("File exceeds the 100 MB limit.");
          else if (e.code === "file-invalid-type") msgs.add(`Only ${formatMimes(tool.acceptedTypes)} files are accepted.`);
          else if (e.code === "too-many-files") msgs.add(`Maximum ${tool.maxFiles} file${tool.maxFiles !== 1 ? "s" : ""} allowed.`);
          else msgs.add(e.message);
        }
      }
      toast({ variant: "destructive", title: "File rejected", description: [...msgs].join(" ") });
    },
    [tool, toast]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: buildAccept(tool.acceptedTypes),
    maxFiles: tool.maxFiles,
    maxSize: MAX_SIZE_BYTES,
    multiple: tool.maxFiles > 1,
    onDropAccepted,
    onDropRejected,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...(getRootProps() as any)}
      className={`
        relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center
        rounded-2xl border-2 border-dashed p-8 text-center outline-none
        transition-all duration-200 select-none
        ${isDragReject
          ? "border-destructive bg-destructive/5"
          : isDragActive
          ? "border-primary bg-primary/5 shadow-sm"
          : hasFiles
          ? "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
        }
      `}
    >
      <input {...getInputProps({ id: "file-dropzone-input" })} />

      <AnimatePresence mode="wait">
        {isDragActive && !isDragReject ? (
          <motion.div
            key="drag-active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-primary">Drop files here</p>
          </motion.div>
        ) : isDragReject ? (
          <motion.div
            key="drag-reject"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <Upload className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Invalid file type</p>
          </motion.div>
        ) : hasFiles ? (
          <motion.div
            key="add-more"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/40 text-muted-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">
              {tool.maxFiles > 1 ? "Add more files" : "Replace file"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Upload className={`h-8 w-8 ${tool.textColor}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Drag & drop {tool.maxFiles > 1 ? "files" : "a file"} here
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                or <span className="font-medium text-primary underline-offset-2 hover:underline">click to browse</span>
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {tool.acceptedTypes.map((t) => (
                <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {formatMimes([t])}
                </span>
              ))}
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Max 100 MB
              </span>
              {tool.maxFiles > 1 && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Up to {tool.maxFiles} files
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
