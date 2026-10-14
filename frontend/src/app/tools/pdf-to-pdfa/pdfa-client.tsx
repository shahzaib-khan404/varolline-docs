"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  FileCheck2,
  Lock,
  ChevronDown,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

export interface ConformanceLevelInfo {
  value: string;
  label: string;
  isoStandard: string;
  pdfVersion: string;
  tag: string;
  description: string;
  features: string[];
}

export const CONFORMANCE_LEVELS: ConformanceLevelInfo[] = [
  {
    value: "1b",
    label: "PDF/A-1b",
    isoStandard: "ISO 19005-1:2005",
    pdfVersion: "PDF 1.4",
    tag: "Basic Visual Preservation",
    description:
      "Ensures the basic visual appearance of the document is preserved reliably over time. Forbids transparency and requires embedded fonts.",
    features: ["Visual layout fidelity", "Strict baseline legacy compliance", "Embedded standard fonts"],
  },
  {
    value: "1a",
    label: "PDF/A-1a",
    isoStandard: "ISO 19005-1:2005",
    pdfVersion: "PDF 1.4",
    tag: "Accessible & Tagged",
    description:
      "Includes all Level 1b requirements plus full logical document structure, semantic tagging, and Unicode character mappings for assistive readers.",
    features: ["Document tagging", "Screen reader accessibility", "Unicode mappings", "Visual preservation"],
  },
  {
    value: "2b",
    label: "PDF/A-2b",
    isoStandard: "ISO 19005-2:2011",
    pdfVersion: "PDF 1.7",
    tag: "Recommended for Modern Archiving",
    description:
      "Modern visual preservation standard. Supports transparency, layers, JPEG 2000 compression, and embedded OpenType fonts.",
    features: ["Transparency supported", "JPEG 2000 images", "High compression", "Universal compatibility"],
  },
  {
    value: "2u",
    label: "PDF/A-2u",
    isoStandard: "ISO 19005-2:2011",
    pdfVersion: "PDF 1.7",
    tag: "Unicode Preservation",
    description:
      "Level 2b features with the requirement that all text has direct Unicode mapping, guaranteeing that text can be searched and copied accurately.",
    features: ["Strict Unicode mapping", "Searchable text guarantee", "Copy-paste reliability", "Transparency allowed"],
  },
  {
    value: "2a",
    label: "PDF/A-2a",
    isoStandard: "ISO 19005-2:2011",
    pdfVersion: "PDF 1.7",
    tag: "Complete Modern Accessibility",
    description:
      "Combines Level 2b and 2u features with full structural and hierarchical tagging for complete accessibility and long-term preservation.",
    features: ["Full structural hierarchy", "Screen reader accessibility", "Transparency allowed", "Unicode mappings"],
  },
  {
    value: "3b",
    label: "PDF/A-3b",
    isoStandard: "ISO 19005-3:2012",
    pdfVersion: "PDF 1.7",
    tag: "Attachment & E-Invoicing Ready",
    description:
      "Allows embedding arbitrary file formats (such as XML invoices like ZUGFeRD / Factur-X, CSV spreadsheets, CAD) inside the archival container.",
    features: ["Allows non-PDF attachments", "E-invoicing compliance (ZUGFeRD)", "Embedded raw data storage", "Modern PDF 1.7"],
  },
  {
    value: "3u",
    label: "PDF/A-3u",
    isoStandard: "ISO 19005-3:2012",
    pdfVersion: "PDF 1.7",
    tag: "Attachments with Unicode",
    description:
      "Level 3b archival support with guaranteed Unicode character mappings for searchable, indexable text and electronic file attachments.",
    features: ["Embedded file attachments", "Strict Unicode mapping", "Indexable text", "E-invoicing"],
  },
  {
    value: "3a",
    label: "PDF/A-3a",
    isoStandard: "ISO 19005-3:2012",
    pdfVersion: "PDF 1.7",
    tag: "Advanced Accessible Container",
    description:
      "Maximum compliance standard combining arbitrary file attachments, complete semantic tagging for accessibility, and Unicode mappings.",
    features: ["Arbitrary attachments", "Full structural tagging", "Screen reader accessibility", "Unicode mappings"],
  },
];

export function PdfToPdfaClient() {
  const tool = TOOL_BY_ID["pdf_to_pdfa"];
  const [conformance, setConformance] = useState<string>("2b");
  const [allowDowngrade, setAllowDowngrade] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const selectedInfo =
    CONFORMANCE_LEVELS.find((lvl) => lvl.value === conformance) ||
    CONFORMANCE_LEVELS.find((lvl) => lvl.value === "2b")!;

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      const opts: Record<string, unknown> = {
        conformance,
        allow_downgrade: allowDowngrade,
      };
      if (password.trim()) {
        opts.password = password.trim();
      }
      return {
        input_file_id: files[0]!.id,
        options: opts,
      };
    },
    [conformance, allowDowngrade, password]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Convert to PDF/A">
      <div className="space-y-6">
        {/* Top Info Banner (iLovePDF Style) */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-foreground/90 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-muted-foreground">
            Choose the ISO standard and conformance level you want to convert your document into for permanent digital preservation.
          </p>
        </div>

        {/* Set the PDF/A conformance level dropdown */}
        <div className="space-y-2">
          <label
            htmlFor="pdfa-conformance-select"
            className="block text-sm font-semibold text-foreground tracking-tight"
          >
            Set the PDF/A conformance level
          </label>

          <div className="relative">
            <select
              id="pdfa-conformance-select"
              value={conformance}
              onChange={(e) => setConformance(e.target.value)}
              className="w-full h-11 px-3.5 pr-10 text-sm font-medium rounded-xl border border-border/80 bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
            >
              {CONFORMANCE_LEVELS.map((level) => (
                <option key={level.value} value={level.value} className="bg-background text-foreground py-1">
                  {level.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Allow Downgrade Option (Matching iLovePDF Exact Workflow) */}
        <div className="rounded-xl border border-border/60 bg-secondary/15 p-4 space-y-2.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="allow-downgrade-checkbox"
              checked={allowDowngrade}
              onChange={(e) => setAllowDowngrade(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <div className="space-y-1 select-none">
              <span className="text-xs font-semibold text-foreground">
                Allow PDF/A level downgrade
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                In order to convert to PDF/A, when certain elements are found in the original PDF, it&apos;s necessary to downgrade to another level to maintain compliance.
              </p>
            </div>
          </label>
        </div>

        {/* Selected Conformance Details Card */}
        <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-cyan-500" />
              <span className="font-semibold text-foreground">{selectedInfo.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({selectedInfo.isoStandard})
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {selectedInfo.pdfVersion}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {selectedInfo.description}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
            {selectedInfo.features.map((feat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md"
              >
                <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Collapsible Advanced Options (Password) */}
        <div className="rounded-xl border border-border/50 bg-secondary/15 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3 text-xs font-medium text-foreground hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Document Security Options</span>
            </div>
            <ChevronDown
              className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", showAdvanced && "rotate-180")}
            />
          </button>

          {showAdvanced && (
            <div className="p-3.5 pt-0 space-y-2 border-t border-border/40 text-xs">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-foreground pt-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span>Document Password (if encrypted)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty if not password protected"
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="text-[10px] text-muted-foreground">
                ISO 19005 strictly forbids password encryption. Providing the password permits permanent decryption during archival conversion.
              </p>
            </div>
          )}
        </div>

        {/* Archival Compliance Guarantee Card */}
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-cyan-500" />
              <span>ISO 19005 Compliance Guarantee</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Validated
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Every converted document undergoes automated sanitization to satisfy international digital preservation standards:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <FileCheck2 className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>Permanent font embedding</span>
            </li>
            <li className="flex items-center gap-1.5">
              <FileCheck2 className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>sRGB IEC61966-2.1 OutputIntent</span>
            </li>
            <li className="flex items-center gap-1.5">
              <FileCheck2 className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>ISO 16684-1 XMP metadata stream</span>
            </li>
            <li className="flex items-center gap-1.5">
              <FileCheck2 className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>Active JS & multimedia stripped</span>
            </li>
            <li className="flex items-center gap-1.5 sm:col-span-2">
              <FileCheck2 className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>Linearized structure for instant web viewing</span>
            </li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
