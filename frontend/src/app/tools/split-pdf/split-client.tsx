"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

type SplitMode = "all" | "ranges" | "every_n";

const MODES: { value: SplitMode; label: string; hint: string }[] = [
  {
    value: "all",
    label: "All pages",
    hint: "Each page becomes a separate PDF file.",
  },
  {
    value: "ranges",
    label: "Page ranges",
    hint: "Enter ranges like: 1-3, 5, 7-10",
  },
  {
    value: "every_n",
    label: "Every N pages",
    hint: "Split into equal chunks of N pages.",
  },
];

function parseRangesError(value: string): string | null {
  if (!value.trim()) return "Enter at least one page or range.";
  if (!/^[\d\s,\-]+$/.test(value))
    return "Only digits, commas, and hyphens are allowed (e.g. 1-3, 5, 7-9).";
  return null;
}

export function SplitPdfClient() {
  const tool = TOOL_BY_ID["split_pdf"];

  const [mode, setMode] = useState<SplitMode>("all");
  const [ranges, setRanges] = useState("");
  const [n, setN] = useState<number>(2);
  const [rangesError, setRangesError] = useState<string | null>(null);

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      if (mode === "ranges") {
        const err = parseRangesError(ranges);
        if (err) throw new Error(err);
      }
      if (mode === "every_n" && n < 1) {
        throw new Error("Pages per chunk must be at least 1.");
      }

      return {
        input_file_id: files[0]!.id,
        options: {
          mode,
          ...(mode === "ranges" && { ranges }),
          ...(mode === "every_n" && { n }),
        },
      };
    },
    [mode, ranges, n]
  );

  const optionsForm = (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Split mode
      </p>

      {/* Mode selector */}
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              mode === m.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/30 hover:bg-accent"
            )}
          >
            <p className="text-xs font-semibold">{m.label}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground leading-snug">
              {m.hint}
            </p>
          </button>
        ))}
      </div>

      {/* Ranges input */}
      {mode === "ranges" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Page ranges</label>
          <input
            type="text"
            placeholder="e.g. 1-3, 5, 7-10"
            value={ranges}
            onChange={(e) => {
              setRanges(e.target.value);
              setRangesError(parseRangesError(e.target.value));
            }}
            className={cn(
              "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none",
              "focus:ring-1 focus:ring-ring",
              rangesError ? "border-destructive focus:ring-destructive" : ""
            )}
          />
          {rangesError ? (
            <p className="text-xs text-destructive">{rangesError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Separate ranges with commas. Pages are 1-indexed.
            </p>
          )}
        </div>
      )}

      {/* Every-N input */}
      {mode === "every_n" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Pages per chunk</label>
          <input
            type="number"
            min={1}
            max={500}
            value={n}
            onChange={(e) => setN(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-9 w-28 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            The last chunk may have fewer pages.
          </p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Output: a ZIP file containing all split PDFs.
      </p>
    </div>
  );

  return (
    <ToolLayout
      tool={tool}
      getJobOptions={getJobOptions}
      actionLabel="Split PDF"
    >
      {optionsForm}
    </ToolLayout>
  );
}
