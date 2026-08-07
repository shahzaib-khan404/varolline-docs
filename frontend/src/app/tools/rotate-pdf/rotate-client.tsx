"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import { RotateCw, RotateCcw } from "lucide-react";
import type { FileRead } from "@/types/api";

type Angle = 90 | 180 | 270;
type PageMode = "all" | "odd" | "even" | "custom";

interface AngleOption {
  value: Angle;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

const ANGLE_OPTIONS: AngleOption[] = [
  {
    value: 90,
    label: "90° clockwise",
    hint: "Rotate right by 90°.",
    icon: <RotateCw className="h-4 w-4" />,
  },
  {
    value: 180,
    label: "180°",
    hint: "Flip upside down.",
    icon: <RotateCw className="h-4 w-4 rotate-90" />,
  },
  {
    value: 270,
    label: "90° counter-clockwise",
    hint: "Rotate left by 90°.",
    icon: <RotateCcw className="h-4 w-4" />,
  },
];

const PAGE_MODES: { value: PageMode; label: string; hint: string }[] = [
  { value: "all", label: "All pages", hint: "Rotate every page." },
  { value: "odd", label: "Odd pages", hint: "Pages 1, 3, 5, …" },
  { value: "even", label: "Even pages", hint: "Pages 2, 4, 6, …" },
  { value: "custom", label: "Custom", hint: "Enter specific pages or ranges." },
];

function validateCustomPages(val: string): string | null {
  if (!val.trim()) return "Enter at least one page or range.";
  if (!/^[\d\s,\-]+$/.test(val))
    return "Only digits, commas, and hyphens allowed (e.g. 1, 3-5, 8).";
  return null;
}

export function RotatePdfClient() {
  const tool = TOOL_BY_ID["rotate_pdf"];
  const [angle, setAngle] = useState<Angle>(90);
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [customPages, setCustomPages] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      if (pageMode === "custom") {
        const err = validateCustomPages(customPages);
        if (err) throw new Error(err);
      }
      return {
        input_file_id: files[0]!.id,
        options: {
          angle,
          pages: pageMode === "custom" ? customPages.trim() : pageMode,
        },
      };
    },
    [angle, pageMode, customPages]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Rotate PDF">
      <div className="space-y-5">
        {/* Angle */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rotation angle
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ANGLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAngle(opt.value)}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all",
                  angle === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-accent"
                )}
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground">{opt.icon}</span>
                <div>
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {opt.hint}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pages */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pages to rotate
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
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
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  {m.hint}
                </p>
              </button>
            ))}
          </div>

          {pageMode === "custom" && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium">Page numbers</label>
              <input
                type="text"
                placeholder="e.g. 1, 3-5, 8"
                value={customPages}
                onChange={(e) => {
                  setCustomPages(e.target.value);
                  setCustomError(validateCustomPages(e.target.value));
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
                  Separate pages with commas. Ranges use a hyphen. Pages are 1-indexed.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Rotation is applied on top of any existing page orientation in the PDF.
        </p>
      </div>
    </ToolLayout>
  );
}
