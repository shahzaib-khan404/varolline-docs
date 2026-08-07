"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

type Fmt = "png" | "jpg";
type Dpi = 72 | 150 | 300;

interface FormatOption {
  value: Fmt;
  label: string;
  description: string;
}

interface DpiOption {
  value: Dpi;
  label: string;
  description: string;
  badge?: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "png",
    label: "PNG",
    description: "Lossless — best for text-heavy pages with sharp edges.",
  },
  {
    value: "jpg",
    label: "JPG",
    description: "Smaller files — great for photos or scanned documents.",
  },
];

const DPI_OPTIONS: DpiOption[] = [
  {
    value: 72,
    label: "72 dpi",
    description: "Screen quality. Smallest files.",
  },
  {
    value: 150,
    label: "150 dpi",
    description: "Standard quality. Good for most uses.",
    badge: "Recommended",
  },
  {
    value: 300,
    label: "300 dpi",
    description: "High resolution. Best for printing.",
  },
];

export function PdfToImageClient() {
  const tool = TOOL_BY_ID["pdf_to_image"];
  const [fmt, setFmt] = useState<Fmt>("png");
  const [dpi, setDpi] = useState<Dpi>(150);

  const getJobOptions = useCallback(
    (files: FileRead[]) => ({
      input_file_id: files[0]!.id,
      options: { format: fmt, dpi },
    }),
    [fmt, dpi]
  );

  const optionsForm = (
    <div className="space-y-5">
      {/* Format */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Image format
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFmt(opt.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                fmt === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30 hover:bg-accent"
              )}
            >
              <p className="text-xs font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* DPI */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resolution
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DPI_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDpi(opt.value)}
              className={cn(
                "relative rounded-lg border p-3 text-left transition-all",
                dpi === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30 hover:bg-accent"
              )}
            >
              {opt.badge && (
                <span className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                  {opt.badge}
                </span>
              )}
              <p className="text-xs font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        All pages are exported and bundled into a single ZIP file. Rendered
        with PyMuPDF — no external dependencies.
      </p>
    </div>
  );

  return (
    <ToolLayout
      tool={tool}
      getJobOptions={getJobOptions}
      actionLabel="Convert to Images"
    >
      {optionsForm}
    </ToolLayout>
  );
}
