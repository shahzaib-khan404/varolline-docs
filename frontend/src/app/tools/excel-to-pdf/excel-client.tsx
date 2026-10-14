"use client";

import { useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { Table, CheckCircle2, FileSpreadsheet } from "lucide-react";
import type { FileRead } from "@/types/api";

const EXCEL_HIGHLIGHTS = [
  "Auto-fits table columns and wrapped text",
  "Preserves cell gridlines, header fills, and typography",
  "Multi-sheet support — each worksheet converted sequentially",
  "Handles XLSX, legacy XLS, and raw CSV exports",
];

export function ExcelToPdfClient() {
  const tool = TOOL_BY_ID["excel_to_pdf"];

  const getJobOptions = useCallback((files: FileRead[]) => {
    return {
      input_file_id: files[0]!.id,
      options: {},
    };
  }, []);

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Convert to PDF">
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Intelligent Spreadsheet Pagination</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Upload your Excel workbook or CSV report. Our converter calculates optimal column widths and prints your tables into crisp, printable PDF pages.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Engine Capabilities:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {EXCEL_HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
