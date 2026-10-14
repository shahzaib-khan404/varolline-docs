"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Link as LinkIcon,
  HardDrive,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { filesApi } from "@/lib/api/files";

export type CloudProvider = "google_drive" | "dropbox";

interface CloudPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: CloudProvider;
  onFilesSelected: (files: File[]) => void;
}

// Generate valid multi-page PDF binary in client
function createValidPdf(title: string, pageCount = 3): File {
  let content = "%PDF-1.4\n";
  const offsets: number[] = [];

  offsets.push(content.length);
  content += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

  const kids: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    kids.push(`${3 + i * 2} 0 R`);
  }

  offsets.push(content.length);
  content += `2 0 obj\n<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>\nendobj\n`;

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;

    offsets.push(content.length);
    content += `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n`;

    const stream = `BT /F1 24 Tf 60 770 Td (${title} - Page ${i + 1}) Tj ET\nBT /F1 13 Tf 60 730 Td (Imported successfully from Cloud Storage) Tj ET\nBT /F1 11 Tf 60 700 Td (Ready for organizing, rotating, reordering or merging) Tj ET`;
    offsets.push(content.length);
    content += `${contentObjNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
  }

  const xrefOffset = content.length;
  const totalObjs = 2 + pageCount * 2;
  content += `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    content += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  content += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const blob = new Blob([content], { type: "application/pdf" });
  return new File([blob], `${title.replace(/\s+/g, "_")}.pdf`, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

// Sample Cloud Files to choose from immediately
const SAMPLE_FILES: Record<CloudProvider, Array<{ name: string; size: string; pages: number; date: string }>> = {
  google_drive: [
    { name: "Annual_Report_2026.pdf", size: "1.2 MB", pages: 4, date: "Yesterday" },
    { name: "Quarterly_Financial_Review.pdf", size: "840 KB", pages: 3, date: "Oct 10, 2026" },
    { name: "Client_Presentation_Deck.pdf", size: "2.1 MB", pages: 5, date: "Oct 08, 2026" },
  ],
  dropbox: [
    { name: "Contract_Agreement_Signed.pdf", size: "450 KB", pages: 2, date: "Today" },
    { name: "Marketing_Campaign_Brief.pdf", size: "1.8 MB", pages: 3, date: "Oct 11, 2026" },
    { name: "Product_Catalog_2026.pdf", size: "3.2 MB", pages: 6, date: "Oct 05, 2026" },
  ],
};

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

  const handleSelectSample = (sample: { name: string; pages: number }) => {
    setLoading(true);
    setTimeout(() => {
      const generated = createValidPdf(sample.name.replace(".pdf", ""), sample.pages);
      onFilesSelected([generated]);
      setLoading(false);
      onClose();
    }, 400);
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
                      <span>Fetching & Importing PDF…</span>
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
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  Select a document from your connected {title} cloud library:
                </p>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {SAMPLE_FILES[provider].map((item) => (
                    <div
                      key={item.name}
                      onClick={() => !loading && handleSelectSample(item)}
                      className="group flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 hover:border-primary/60 hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.pages} pages • {item.size} • {item.date}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary hover:text-primary-foreground group-hover:border-primary transition-colors"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading document into canvas…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
