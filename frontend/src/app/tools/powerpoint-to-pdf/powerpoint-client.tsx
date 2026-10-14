"use client";

import { useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { Presentation, CheckCircle2, Sparkles, Layers } from "lucide-react";
import type { FileRead } from "@/types/api";

const PPT_FEATURES = [
  "Preserves 16:9 widescreen and 4:3 slide geometry",
  "Vector-sharp graphic rendering & font embedding",
  "Retains diagram layouts, shapes, and tables",
  "Dual-engine processing (Headless LibreOffice + Python)",
];

export function PowerPointToPdfClient() {
  const tool = TOOL_BY_ID["powerpoint_to_pdf"];

  const getJobOptions = useCallback((files: FileRead[]) => {
    return {
      input_file_id: files[0]!.id,
      options: {},
    };
  }, []);

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Convert to PDF">
      <div className="space-y-4">
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Presentation className="h-4 w-4 text-orange-500" />
            <span>High-Fidelity Presentation Engine</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Your PowerPoint slides (.pptx and .ppt) are rasterized and compiled into a clean, searchable PDF with original slide ratios and crystal-clear text sharpness.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversion Features:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {PPT_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
