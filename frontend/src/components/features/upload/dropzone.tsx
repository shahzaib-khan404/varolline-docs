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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      {...(getRootProps() as any)}
      className={`
        relative flex cursor-pointer flex-col items-center justify-center
        rounded-none border border-dashed text-center outline-none select-none transition-colors
        ${hasFiles ? "min-h-[140px] p-5" : "min-h-[200px] p-7"}
        ${isDragReject
          ? "border-destructive bg-destructive/5"
          : isDragActive
          ? "border-primary bg-primary/5"
          : hasFiles
          ? "border-border/80 bg-card/60 backdrop-blur-md hover:border-primary/60 hover:bg-card/90"
          : "border-border/80 bg-card/60 backdrop-blur-md hover:border-primary/60 hover:bg-card/90"
        }
      `}
    >
      <input {...getInputProps({ id: "file-dropzone-input" })} />

      <AnimatePresence mode="wait">
        {isDragActive && !isDragReject ? (
          <motion.div
            key="drag-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-primary">Drop files here</p>
          </motion.div>
        ) : isDragReject ? (
          <motion.div
            key="drag-reject"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-none bg-destructive/10 text-destructive">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-destructive">Invalid file type</p>
          </motion.div>
        ) : hasFiles ? (
          <motion.div
            key="add-more"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-none border border-dashed border-border text-muted-foreground">
              <Plus className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {tool.maxFiles > 1 ? "Add more files" : "Replace file"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-muted border border-border">
              <Upload className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drag & drop {tool.maxFiles > 1 ? "files" : "a file"} here
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                or <span className="font-semibold text-primary hover:underline">click to browse</span>
              </p>
            </div>
            <div className="mt-0.5 flex flex-wrap justify-center gap-1.5">
              {tool.acceptedTypes.map((t) => (
                <span key={t} className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  {formatMimes([t])}
                </span>
              ))}
              <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Max 100 MB
              </span>
              {tool.maxFiles > 1 && (
                <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
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
