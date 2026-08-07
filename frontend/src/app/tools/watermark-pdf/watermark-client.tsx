"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

type AnglePreset = { label: string; value: number };
type ColorPreset = { label: string; value: string; swatch: string };
type OpacityPreset = { label: string; value: number };
type PageMode = "all" | "odd" | "even" | "custom";

const ANGLE_PRESETS: AnglePreset[] = [
  { label: "Diagonal", value: 45 },
  { label: "Horizontal", value: 0 },
  { label: "Vertical", value: 90 },
];

const COLOR_PRESETS: ColorPreset[] = [
  { label: "Grey", value: "#808080", swatch: "bg-gray-400" },
  { label: "Red", value: "#dc2626", swatch: "bg-red-600" },
  { label: "Blue", value: "#2563eb", swatch: "bg-blue-600" },
  { label: "Black", value: "#111111", swatch: "bg-neutral-900" },
];

const OPACITY_PRESETS: OpacityPreset[] = [
  { label: "Light", value: 0.15 },
  { label: "Medium", value: 0.3 },
  { label: "Dark", value: 0.5 },
];

const PAGE_MODES: { value: PageMode; label: string }[] = [
  { value: "all", label: "All pages" },
  { value: "odd", label: "Odd pages" },
  { value: "even", label: "Even pages" },
  { value: "custom", label: "Custom" },
];

function validateText(v: string): string | null {
  if (!v.trim()) return "Watermark text cannot be empty.";
  if (v.length > 80) return "Keep watermark text under 80 characters.";
  return null;
}

function validatePages(v: string): string | null {
  if (!v.trim()) return "Enter at least one page or range.";
  if (!/^[\d\s,\-]+$/.test(v)) return "Only digits, commas, and hyphens allowed.";
  return null;
}

export function WatermarkPdfClient() {
  const tool = TOOL_BY_ID["watermark_pdf"];

  const [text, setText] = useState("CONFIDENTIAL");
  const [textError, setTextError] = useState<string | null>(null);
  const [angle, setAngle] = useState(45);
  const [color, setColor] = useState("#808080");
  const [opacity, setOpacity] = useState(0.3);
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [customPages, setCustomPages] = useState("");
  const [customPagesError, setCustomPagesError] = useState<string | null>(null);

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      const tErr = validateText(text);
      if (tErr) throw new Error(tErr);
      if (pageMode === "custom") {
        const pErr = validatePages(customPages);
        if (pErr) throw new Error(pErr);
      }
      return {
        input_file_id: files[0]!.id,
        options: {
          text: text.trim(),
          angle,
          color,
          opacity,
          pages: pageMode === "custom" ? customPages.trim() : pageMode,
        },
      };
    },
    [text, angle, color, opacity, pageMode, customPages]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Add Watermark">
      <div className="space-y-5">
        {/* Watermark text */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Watermark text
          </label>
          <input
            type="text"
            value={text}
            maxLength={80}
            onChange={(e) => {
              setText(e.target.value);
              setTextError(validateText(e.target.value));
            }}
            placeholder="e.g. CONFIDENTIAL"
            className={cn(
              "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none",
              "focus:ring-1 focus:ring-ring",
              textError ? "border-destructive focus:ring-destructive" : ""
            )}
          />
          {textError && <p className="text-xs text-destructive">{textError}</p>}
        </div>

        {/* Angle */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Orientation
          </p>
          <div className="flex gap-2">
            {ANGLE_PRESETS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAngle(a.value)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  angle === a.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-accent"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color + Opacity row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Color
            </p>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    c.swatch,
                    color === c.value ? "border-foreground scale-110" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Opacity
            </p>
            <div className="flex gap-2">
              {OPACITY_PRESETS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOpacity(o.value)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all",
                    opacity === o.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/30 hover:bg-accent"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pages */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Apply to
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
                  setCustomPagesError(validatePages(e.target.value));
                }}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none",
                  "focus:ring-1 focus:ring-ring",
                  customPagesError ? "border-destructive focus:ring-destructive" : ""
                )}
              />
              {customPagesError ? (
                <p className="text-xs text-destructive">{customPagesError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Separate with commas. Ranges use a hyphen. Pages are 1-indexed.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Watermark is rendered with PDF transparency — text stays selectable underneath.
        </p>
      </div>
    </ToolLayout>
  );
}
