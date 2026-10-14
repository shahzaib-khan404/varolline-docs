"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { FileCode, Sliders, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

const PAGE_SIZES = [
  { id: "A4", label: "A4 (Standard)", desc: "210 × 297 mm" },
  { id: "Letter", label: "Letter (US)", desc: "8.5 × 11 in" },
];

const MARGIN_OPTIONS = [
  { id: "18", label: "Compact", pts: 18 },
  { id: "36", label: "Standard", pts: 36 },
  { id: "54", label: "Wide", pts: 54 },
];

export function HtmlToPdfClient() {
  const tool = TOOL_BY_ID["html_to_pdf"];
  const [pageSize, setPageSize] = useState("A4");
  const [margin, setMargin] = useState("36");

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      return {
        input_file_id: files[0]!.id,
        options: {
          page_size: pageSize,
          margin: parseFloat(margin) || 36.0,
        },
      };
    },
    [pageSize, margin]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Convert to PDF">
      <div className="space-y-6">
        {/* Page Size Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sliders className="h-4 w-4 text-sky-500" />
            <span>Target Page Size</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PAGE_SIZES.map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => setPageSize(sz.id)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  pageSize === sz.id
                    ? "border-sky-500 bg-sky-500/10 text-foreground font-semibold shadow-sm"
                    : "border-border/50 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
                )}
              >
                <div className="text-xs font-semibold">{sz.label}</div>
                <div className="text-[10px] text-muted-foreground">{sz.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Margin Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sliders className="h-4 w-4 text-sky-500" />
            <span>Margin Padding</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MARGIN_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMargin(m.id)}
                className={cn(
                  "py-2 px-3 rounded-xl border text-center transition-all text-xs font-medium",
                  margin === m.id
                    ? "border-sky-500 bg-sky-500/10 text-foreground font-semibold shadow-sm"
                    : "border-border/50 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FileCode className="h-4 w-4 text-sky-500" />
            <span>PyMuPDF Story Layout Engine</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Full CSS flow formatting, typography hyphenation, automatic table breaks across pages, and native vector rendering.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
