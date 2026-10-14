"use client";

import { useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { GitCompare, FileCheck, CheckCircle2, AlertCircle } from "lucide-react";
import type { FileRead } from "@/types/api";

export function ComparePdfClient() {
  const tool = TOOL_BY_ID["compare_pdf"];

  const getJobOptions = useCallback((files: FileRead[]) => {
    return {
      input_file_id: files[0]!.id,
      options: {
        secondary_file_id: files[1]?.id ?? files[0]!.id,
      },
    };
  }, []);

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Compare Documents">
      <div className="space-y-6">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <GitCompare className="h-4 w-4 text-purple-400" />
            <span>Dual-Document Comparison Engine</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Upload both the original document and the updated revision. Our comparison engine analyzes paragraph structures, token coordinates, and text additions/deletions.
          </p>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Generated Report Includes:
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Similarity Score percentage index (0–100%)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Green highlights for added content & new lines</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>Red highlights for removed phrases & deleted sections</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>Executive change summary cover sheet prepended to output</span>
            </li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
