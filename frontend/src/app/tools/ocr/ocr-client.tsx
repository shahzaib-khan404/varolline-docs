"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import { FileText, File } from "lucide-react";
import type { FileRead } from "@/types/api";

type OutputFormat = "txt" | "pdf";
type PageMode = "all" | "odd" | "even" | "custom";

const OUTPUT_OPTIONS: { value: OutputFormat; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: "txt",
    label: "Plain text (.txt)",
    hint: "Extract all text into a simple text file.",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: "pdf",
    label: "Searchable PDF",
    hint: "Keep the original layout with a hidden searchable text layer.",
    icon: <File className="h-4 w-4" />,
  },
];

const LANGUAGES: { value: string; label: string }[] = [
  { value: "eng", label: "English" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "spa", label: "Spanish" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
  { value: "chi_sim", label: "Chinese (Simplified)" },
  { value: "jpn", label: "Japanese" },
  { value: "ara", label: "Arabic" },
];

const PAGE_MODES: { value: PageMode; label: string }[] = [
  { value: "all", label: "All pages" },
  { value: "odd", label: "Odd pages" },
  { value: "even", label: "Even pages" },
  { value: "custom", label: "Custom" },
];

function validatePages(v: string): string | null {
  if (!v.trim()) return "Enter at least one page or range.";
  if (!/^[\d\s,\-]+$/.test(v)) return "Only digits, commas, and hyphens allowed.";
  return null;
}

export function OcrClient() {
  const tool = TOOL_BY_ID["ocr_extraction"];
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("txt");
  const [language, setLanguage] = useState("eng");
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [customPages, setCustomPages] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      if (pageMode === "custom") {
        const err = validatePages(customPages);
        if (err) throw new Error(err);
      }
      return {
        input_file_id: files[0]!.id,
        options: {
          output_format: outputFormat,
          language,
          pages: pageMode === "custom" ? customPages.trim() : pageMode,
          dpi: 200,
        },
      };
    },
    [outputFormat, language, pageMode, customPages]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Extract Text">
      <div className="space-y-5">
        {/* Output format */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Output format
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {OUTPUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOutputFormat(opt.value)}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all",
                  outputFormat === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-accent"
                )}
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground">{opt.icon}</span>
                <div>
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{opt.hint}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Document language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            Selecting the correct language improves OCR accuracy significantly.
          </p>
        </div>

        {/* Pages */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pages to process
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {PAGE_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPageMode(m.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  pageMode === m.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-accent"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {pageMode === "custom" && (
            <div className="space-y-1.5 pt-1">
              <input
                type="text"
                placeholder="e.g. 1, 3-5, 8"
                value={customPages}
                onChange={(e) => {
                  setCustomPages(e.target.value);
                  setCustomError(validatePages(e.target.value));
                }}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none",
                  "focus:ring-1 focus:ring-ring",
                  customError ? "border-destructive focus:ring-destructive" : ""
                )}
              />
              {customError ? (
                <p className="text-xs text-destructive">{customError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Comma-separated pages or ranges. Pages are 1-indexed.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Native PDF text is extracted instantly. Scanned pages require Tesseract OCR — processing
          may take a few seconds per page.
        </p>
      </div>
    </ToolLayout>
  );
}
