"use client";

import { useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { Table, CheckCircle2, Database, Sparkles } from "lucide-react";
import type { FileRead } from "@/types/api";

const EXTRACTION_FEATURES = [
  "C-level structural table detection via PyMuPDF",
  "Creates separate sheets for each document page",
  "Preserves numerical formatting and multiline cell text",
  "Auto-styles output with headers and alternating row shading",
];

export function PdfToExcelClient() {
  const tool = TOOL_BY_ID["pdf_to_excel"];

  const getJobOptions = useCallback((files: FileRead[]) => {
    return {
      input_file_id: files[0]!.id,
      options: {},
    };
  }, []);

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Extract to Excel">
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Database className="h-4 w-4 text-green-500" />
            <span>AI-Assisted Table Extraction</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Our extraction engine parses vector coordinates and explicit cell borders in your PDF to reconstruct editable data tables without mixing rows or truncating numeric values.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Extraction Features:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {EXTRACTION_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
