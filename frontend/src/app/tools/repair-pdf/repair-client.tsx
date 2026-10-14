"use client";

import { useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { Wrench, CheckCircle2 } from "lucide-react";
import type { FileRead } from "@/types/api";

const REPAIR_CAPABILITIES = [
  "Rebuild damaged cross-reference (XREF) tables",
  "Recover unclosed or truncated stream objects",
  "Sanitize malformed font glyphs and vector dictionaries",
  "Restore linearized web viewing structure",
];

export function RepairPdfClient() {
  const tool = TOOL_BY_ID["repair_pdf"];

  const getJobOptions = useCallback((files: FileRead[]) => {
    return {
      input_file_id: files[0]!.id,
      options: {},
    };
  }, []);

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Repair PDF">
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Wrench className="h-4 w-4 text-amber-500" />
            <span>Automated 2-Stage PDF Recovery</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Our engine inspects the structural hierarchy of your uploaded document, scans for broken byte tokens, and reconstructs the internal stream tree without loss of document content.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What gets repaired:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {REPAIR_CAPABILITIES.map((cap) => (
              <li key={cap} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
