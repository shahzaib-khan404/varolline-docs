"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { Scan, Languages, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

const LANGUAGES = [
  { id: "eng", name: "English" },
  { id: "spa", name: "Spanish" },
  { id: "fra", name: "French" },
  { id: "deu", name: "German" },
  { id: "ita", name: "Italian" },
];

export function OcrPdfClient() {
  const tool = TOOL_BY_ID["ocr_pdf"];
  const [language, setLanguage] = useState("eng");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "txt">("pdf");

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      return {
        input_file_id: files[0]!.id,
        options: {
          language,
          output_format: outputFormat,
        },
      };
    },
    [language, outputFormat]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Run OCR Recognition">
      <div className="space-y-6">
        {/* Output Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Output Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutputFormat("pdf")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                outputFormat === "pdf"
                  ? "border-sky-500 bg-sky-500/10 text-foreground font-semibold shadow-sm"
                  : "border-border/60 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
              )}
            >
              <div className="text-xs font-semibold">Searchable PDF</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Invisible text layer over original layout
              </div>
            </button>
            <button
              type="button"
              onClick={() => setOutputFormat("txt")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                outputFormat === "txt"
                  ? "border-sky-500 bg-sky-500/10 text-foreground font-semibold shadow-sm"
                  : "border-border/60 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
              )}
            >
              <div className="text-xs font-semibold">Plain Text (.txt)</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Raw extracted text stream
              </div>
            </button>
          </div>
        </div>

        {/* OCR Language Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Languages className="h-4 w-4 text-sky-500" />
            <span>Document Language</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={cn(
                  "py-2 px-2.5 rounded-lg border text-center text-xs transition-all",
                  language === lang.id
                    ? "border-sky-500 bg-sky-500/15 text-foreground font-semibold"
                    : "border-border/50 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
                )}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-sky-500" />
            <span>Intelligent Text Layer Embedding</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Our engine preserves the exact visual appearance of scanned pages while aligning invisible OCR text directly underneath, enabling text selection, keyword search (Ctrl+F), and copy-pasting.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
