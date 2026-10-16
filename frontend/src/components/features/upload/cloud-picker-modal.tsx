"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Link as LinkIcon,
  HardDrive,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { filesApi } from "@/lib/api/files";

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
  const [activeTab, setActiveTab] = useState<"link" | "browse">("link");
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
      // Import file via backend URL upload
      const fileData = await filesApi.uploadFromUrl(url.trim());

      // Fetch the binary stream from backend URL and instantiate local File object
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-background shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              {isGDrive ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <svg className="h-5 w-5" viewBox="0 0 87.3 78" fill="none">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                    <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.45c-.8 1.4-1.2 2.95-1.2 4.5h27.45z" fill="#00AC47"/>
                    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l6.4 11.1z" fill="#EA4335"/>
                    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z" fill="#00832D"/>
                    <path d="M59.85 53H87.3c0-1.55-.4-3.1-1.2-4.5L72.35 25l-13.75 23.8z" fill="#FFBA00"/>
                    <path d="M73.55 76.8H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.9c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/>
                  </svg>
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <svg className="h-5 w-5 fill-[#0061FF]" viewBox="0 0 24 24">
                    <path d="M6 2.5 0 6.65l6 4.15 6-4.15L6 2.5zm12 0-6 4.15 6 4.15 6-4.15L18 2.5zM0 14.95l6 4.15 6-4.15-6-4.15-6 4.15zm18-4.15-6 4.15 6 4.15 6-4.15-6-4.15zM6 20.35l6 4.15 6-4.15-6-4.15-6 4.15z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground text-sm">Upload from {title}</h3>
                <p className="text-[11px] text-muted-foreground">Import PDF documents directly into your workspace</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-border/60 bg-muted/30 px-5 pt-2">
            <button
              onClick={() => { setActiveTab("link"); setError(null); }}
              className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "link"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Share Link Import</span>
            </button>
            <button
              onClick={() => { setActiveTab("browse"); setError(null); }}
              className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "browse"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span>Browse Cloud Files</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === "link" ? (
              <form onSubmit={handleImportUrl} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Paste {title} Shared Link:
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={placeholderUrl}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ensure link permissions are set to <strong>"Anyone with the link can view"</strong> so our engine can fetch the PDF.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Fetching & Importing PDF...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Import from {title}</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-6 px-4 text-center space-y-3 rounded-xl border border-dashed border-border/80 bg-card/50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">
                    Direct Cloud Library Access Not Connected
                  </h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Direct directory browsing requires Google Drive Picker API permissions. Please use the <strong>Share Link Import</strong> tab to paste your document link directly.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("link")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <span>Go to Share Link Import</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
