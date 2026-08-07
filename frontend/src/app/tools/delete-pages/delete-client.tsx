"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

type PageMode = "custom" | "odd" | "even";

const PAGE_MODES: { value: PageMode; label: string; hint: string }[] = [
  { value: "custom", label: "Specific pages", hint: "Enter pages or ranges to remove." },
  { value: "odd", label: "Odd pages", hint: "Remove pages 1, 3, 5, …" },
  { value: "even", label: "Even pages", hint: "Remove pages 2, 4, 6, …" },
];

function validatePages(val: string): string | null {
  if (!val.trim()) return "Enter at least one page or range.";
  if (!/^[\d\s,\-]+$/.test(val))
    return "Only digits, commas, and hyphens allowed (e.g. 1, 3-5, 8).";
  return null;
}

export function DeletePagesClient() {
  const tool = TOOL_BY_ID["delete_pages"];
  const [pageMode, setPageMode] = useState<PageMode>("custom");
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
          pages: pageMode === "custom" ? customPages.trim() : pageMode,
        },
      };
    },
    [pageMode, customPages]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Delete Pages">
      <div className="space-y-5">
        {/* Mode */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pages to remove
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {PAGE_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPageMode(m.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  pageMode === m.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-accent"
                )}
              >
                <p className="text-xs font-semibold">{m.label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{m.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom page input */}
        {pageMode === "custom" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Page numbers</label>
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
                Separate with commas. Ranges use a hyphen. Pages are 1-indexed.
              </p>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          At least one page must remain. The resulting PDF is downloaded as a single file.
        </p>
      </div>
    </ToolLayout>
  );
}
