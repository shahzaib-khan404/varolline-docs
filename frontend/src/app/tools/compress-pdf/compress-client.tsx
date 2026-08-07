"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

type Quality = "screen" | "ebook" | "printer" | "prepress";

interface Preset {
  value: Quality;
  label: string;
  dpi: string;
  description: string;
  badge?: string;
}

const PRESETS: Preset[] = [
  {
    value: "screen",
    label: "Screen",
    dpi: "72 dpi",
    description: "Smallest file size. Best for email or web viewing.",
  },
  {
    value: "ebook",
    label: "eBook",
    dpi: "150 dpi",
    description: "Good balance of quality and size. Works for most uses.",
    badge: "Recommended",
  },
  {
    value: "printer",
    label: "Printer",
    dpi: "300 dpi",
    description: "High quality. Suitable for desktop printing.",
  },
  {
    value: "prepress",
    label: "Prepress",
    dpi: "300+ dpi",
    description: "Maximum quality with colour profiles preserved.",
  },
];

export function CompressPdfClient() {
  const tool = TOOL_BY_ID["compress_pdf"];
  const [quality, setQuality] = useState<Quality>("ebook");

  const getJobOptions = useCallback(
    (files: FileRead[]) => ({
      input_file_id: files[0]!.id,
      options: { quality },
    }),
    [quality]
  );

  const optionsForm = (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Compression quality
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => setQuality(preset.value)}
            className={cn(
              "relative rounded-lg border p-3 text-left transition-all",
              quality === preset.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/30 hover:bg-accent"
            )}
          >
            {preset.badge && (
              <span className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                {preset.badge}
              </span>
            )}
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-semibold">{preset.label}</p>
              <span className="text-[10px] text-muted-foreground">{preset.dpi}</span>
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {preset.description}
            </p>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Powered by Ghostscript. If the compressed file is larger than the
        original, the original is returned unchanged.
      </p>
    </div>
  );

  return (
    <ToolLayout
      tool={tool}
      getJobOptions={getJobOptions}
      actionLabel="Compress PDF"
    >
      {optionsForm}
    </ToolLayout>
  );
}
