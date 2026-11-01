"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { filesApi } from "@/lib/api/files";
import { Button } from "@/components/ui/button";

export type CloudProvider = "google_drive" | "dropbox";

interface CloudPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: CloudProvider;
  onFilesSelected: (files: File[]) => void;
}

export function CloudPickerModal({
  isOpen,
  onClose,
  provider,
  onFilesSelected,
}: CloudPickerModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGDrive = provider === "google_drive";
  const title = isGDrive ? "Google Drive" : "Dropbox";
  const placeholderUrl = isGDrive
    ? "https://drive.google.com/file/d/1.../view?usp=sharing"
    : "https://www.dropbox.com/s/sample/document.pdf?dl=0";

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const fileData = await filesApi.uploadFromUrl(url.trim());

      const resp = await fetch(fileData.url);
      if (!resp.ok) {
        throw new Error("Failed to load imported file from storage.");
      }
      const blob = await resp.blob();
      const importedFile = new File([blob], fileData.original_filename, {
        type: fileData.mime_type || "application/pdf",
        lastModified: Date.now(),
      });

      onFilesSelected([importedFile]);
      setUrl("");
      onClose();
    } catch (err: any) {
      console.error("Cloud import error:", err);
      const detail =
        err?.response?.data?.detail ??
        err?.message ??
        "Failed to download PDF from the provided link. Please ensure link sharing is set to 'Anyone with the link'.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="relative w-full max-w-lg rounded-none border border-border bg-background shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              {isGDrive ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-none bg-amber-500/10 border border-amber-500/20">
                  <svg className="h-4 w-4" viewBox="0 0 87.3 78" fill="none">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                    <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.45c-.8 1.4-1.2 2.95-1.2 4.5h27.45z" fill="#00AC47"/>
                    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l6.4 11.1z" fill="#EA4335"/>
                    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z" fill="#00832D"/>
                    <path d="M59.85 53H87.3c0-1.55-.4-3.1-1.2-4.5L72.35 25l-13.75 23.8z" fill="#FFBA00"/>
                    <path d="M73.55 76.8H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.9c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/>
                  </svg>
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-none bg-blue-500/10 border border-blue-500/20">
                  <svg className="h-4 w-4 fill-[#0061FF]" viewBox="0 0 24 24">
                    <path d="M6 2.5 0 6.65l6 4.15 6-4.15L6 2.5zm12 0-6 4.15 6 4.15 6-4.15L18 2.5zM0 14.95l6 4.15 6-4.15-6-4.15-6 4.15zm18-4.15-6 4.15 6 4.15 6-4.15-6-4.15zM6 20.35l6 4.15 6-4.15-6-4.15-6 4.15z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-foreground">Import from {title}</h3>
                <p className="text-[11px] text-muted-foreground">Paste a public shared file link</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <form onSubmit={handleImportUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Shared File Link
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={placeholderUrl}
                    required
                    className="w-full rounded-none border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-none border border-destructive/30 bg-destructive/5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="rounded-none bg-sky-600 hover:bg-sky-700 text-white text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    "Import Document"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
