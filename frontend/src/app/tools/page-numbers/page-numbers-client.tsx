"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  ZoomIn,
  FileText,
  Bold,
  Italic,
  Underline,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/ui/tool-icon";
import { Input } from "@/components/ui/input";
import { Dropzone } from "@/components/features/upload/dropzone";
import { JobResult } from "@/components/features/upload/job-result";
import { TOOL_BY_ID } from "@/config/tools";
import { useUpload } from "@/hooks/use-upload";
import { jobsApi, filesApi } from "@/lib/api/files";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

type MatrixPos =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

const MATRIX_CELLS: MatrixPos[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const TEXT_TEMPLATES = [
  { id: "number-only", label: "Insert only page number (recommended)", tpl: "{n}" },
  { id: "page-n", label: "Page {n}", tpl: "Page {n}" },
  { id: "page-n-total", label: "Page {n} of {total}", tpl: "Page {n} of {total}" },
  { id: "n-total", label: "{n} / {total}", tpl: "{n} / {total}" },
  { id: "custom", label: "Custom format...", tpl: "" },
];

const FONT_OPTIONS = [
  { id: "helv", name: "Arial / Helvetica" },
  { id: "times", name: "Times New Roman" },
  { id: "courier", name: "Courier" },
];

const COLOR_OPTIONS = [
  { id: "black", rgb: [0.1, 0.1, 0.1], bg: "bg-slate-900", label: "Dark" },
  { id: "gray", rgb: [0.4, 0.4, 0.4], bg: "bg-slate-500", label: "Gray" },
  { id: "blue", rgb: [0.1, 0.4, 0.9], bg: "bg-blue-600", label: "Blue" },
  { id: "red", rgb: [0.85, 0.15, 0.15], bg: "bg-red-600", label: "Red" },
];

export function PageNumbersClient() {
  const tool = TOOL_BY_ID["page_numbers"];
  const upload = useUpload();

  // Settings State
  const [pageMode, setPageMode] = useState<"single" | "facing">("single");
  const [position, setPosition] = useState<MatrixPos>("bottom-center");
  const [marginPreset, setMarginPreset] = useState<"recommended" | "small" | "large">("recommended");
  const [firstNumber, setFirstNumber] = useState<number>(1);
  const [fromPage, setFromPage] = useState<number>(1);
  const [toPage, setToPage] = useState<number>(2);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("number-only");
  const [customFormat, setCustomFormat] = useState<string>("{n}");

  // Typography State
  const [fontFamily, setFontFamily] = useState<string>("helv");
  const [fontSize, setFontSize] = useState<number>(10);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<[number, number, number]>([0.1, 0.1, 0.1]);

  // Processing State
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Active template string
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId === "custom") return customFormat;
    const found = TEXT_TEMPLATES.find((t) => t.id === selectedTemplateId);
    return found ? found.tpl : "{n}";
  }, [selectedTemplateId, customFormat]);

  // Live Page Previews from Real PDF
  const [pagePreviews, setPagePreviews] = useState<
    Array<{ page_num: number; data_url: string; width: number; height: number }>
  >([]);
  const [loadingPreviews, setLoadingPreviews] = useState<boolean>(false);
  const [totalPagesCount, setTotalPagesCount] = useState<number>(2);

  const activeItem = upload.items[0];

  // Fetch real PDF page previews whenever the active file changes
  useEffect(() => {
    if (!activeItem?.file) {
      setPagePreviews([]);
      return;
    }

    let isCancelled = false;
    setLoadingPreviews(true);

    filesApi
      .previewPages(activeItem.file, 20)
      .then((res) => {
        if (isCancelled) return;
        setPagePreviews(res.previews || []);
        if (res.total_pages) {
          setTotalPagesCount(res.total_pages);
          setToPage(res.total_pages);
        }
      })
      .catch((err) => {
        console.warn("Could not load PDF previews from backend:", err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingPreviews(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeItem?.file]);

  // Number of preview pages to display
  const previewPagesCount = Math.max(totalPagesCount, toPage);
  const previewPages = useMemo(() => {
    return Array.from({ length: previewPagesCount }, (_, i) => i + 1);
  }, [previewPagesCount]);

  // Position class resolver for preview dot
  const getDotPositionClasses = (pos: MatrixPos, pageNum: number) => {
    let effectivePos = pos;
    // If facing pages mode, mirror even pages
    if (pageMode === "facing" && pageNum % 2 === 0) {
      if (effectivePos.includes("left")) {
        effectivePos = effectivePos.replace("left", "right") as MatrixPos;
      } else if (effectivePos.includes("right")) {
        effectivePos = effectivePos.replace("right", "left") as MatrixPos;
      }
    }

    const marginPx = marginPreset === "small" ? 8 : marginPreset === "large" ? 22 : 14;

    const style: React.CSSProperties = { position: "absolute" };
    if (effectivePos.startsWith("top")) {
      style.top = `${marginPx}px`;
    } else if (effectivePos.startsWith("middle")) {
      style.top = "50%";
      style.transform = "translateY(-50%)";
    } else {
      style.bottom = `${marginPx}px`;
    }

    if (effectivePos.endsWith("left")) {
      style.left = `${marginPx}px`;
    } else if (effectivePos.endsWith("right")) {
      style.right = `${marginPx}px`;
    } else {
      style.left = "50%";
      style.transform = (style.transform ? `${style.transform} ` : "") + "translateX(-50%)";
    }

    return { dotStyle: style, effectivePos };
  };

  const handleProcess = async () => {
    setServerError(null);
    setProcessing(true);
    try {
      const files = await upload.uploadAll();
      const succeeded = files.filter(Boolean) as FileRead[];
      const inputFile = succeeded[0];
      if (!inputFile) {
        setServerError("No file uploaded. Please upload a PDF file first.");
        return;
      }

      const payload = {
        tool: tool.id,
        input_file_id: inputFile.id,
        options: {
          position,
          page_mode: pageMode,
          format: activeTemplate,
          start_page: Number(fromPage) || 1,
          end_page: Number(toPage) || undefined,
          first_number: Number(firstNumber) || 1,
          margin: marginPreset,
          font_size: Number(fontSize) || 10,
          font_name: fontFamily,
          bold: isBold,
          italic: isItalic,
          color: selectedColor,
        },
      };

      const job = await jobsApi.create(payload);
      setJobId(job.id);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.detail ??
        (err as any)?.response?.data?.message ??
        (err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setServerError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setServerError(null);
    setPagePreviews([]);
    setTotalPagesCount(2);
    setFromPage(1);
    setToPage(2);
    upload.clear();
  };

  // If job completed, show standard animated JobResult screen
  if (jobId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <JobResult jobId={jobId} toolName={tool.name} onReset={handleReset} />
      </div>
    );
  }

  // If no file uploaded yet, show standard initial dropzone
  if (upload.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/tools"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
              tool.color
            )}
          >
            <ToolIcon name={tool.icon} className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{tool.name}</h1>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </div>
        </div>
        <Dropzone tool={tool} hasFiles={false} onDrop={upload.addFiles} />
      </div>
    );
  }

  // Side-by-side interactive page number studio
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 dark:bg-slate-950/60">
      <div className="max-w-[1520px] mx-auto px-4 py-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Tools
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              Interactive Page Number Studio
            </span>
          </div>
        </div>

        {/* 2-Column Split: Left = Live Visual Preview | Right = Options Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
          {/* ── LEFT COLUMN: Document Canvas & Live Page Indicator ── */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* File Header Bar */}
            <div className="w-full max-w-3xl flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/80 shadow-sm text-xs font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[240px] sm:max-w-[360px]">
                    {activeItem?.file?.name || "document.pdf"}
                  </span>
                  <span className="text-[10px] text-muted-foreground border-l pl-2 border-border/80">
                    {totalPagesCount} {totalPagesCount === 1 ? "page" : "pages"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 rounded-xl border border-border/60 hover:border-destructive/50 bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shadow-sm"
                  title="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Add file button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-9 w-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center shadow-md transition-all"
                  title="Replace file"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-900 border border-white text-[9px] font-bold text-white flex items-center justify-center">
                  1
                </span>
              </div>
            </div>

            {/* Document Pages Grid with Live Real PDF and Red Dot Position */}
            <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-slate-100/70 dark:bg-slate-900/40 p-6 sm:p-10 shadow-inner flex flex-wrap justify-center gap-6 sm:gap-8 overflow-y-auto max-h-[720px]">
              {previewPages.map((pageNum) => {
                const isNumbered = pageNum >= fromPage && pageNum <= toPage;
                const previewObj = pagePreviews.find((p) => p.page_num === pageNum);
                const { dotStyle } = getDotPositionClasses(position, pageNum);

                // Compute evaluated number for this page
                const evalNumber = firstNumber + (pageNum - fromPage);
                const displayText = isNumbered
                  ? activeTemplate
                      .replace("{n}", String(evalNumber))
                      .replace("{total}", String(Math.max(1, toPage - fromPage + 1)))
                  : "";

                return (
                  <div
                    key={pageNum}
                    className="relative group flex flex-col items-center"
                  >
                    {/* Page Card */}
                    <div
                      className={cn(
                        "relative w-[190px] h-[268px] sm:w-[220px] sm:h-[310px] rounded-xl bg-white text-slate-900 shadow-md border transition-all duration-300 overflow-hidden flex flex-col items-center justify-center p-0 select-none",
                        isNumbered
                          ? "border-slate-300 ring-2 ring-primary/20 shadow-lg"
                          : "border-slate-200 opacity-60 grayscale-[40%]"
                      )}
                    >
                      {/* REAL PDF RENDERED PAGE CONTENT */}
                      {previewObj ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-white p-1">
                          <img
                            src={previewObj.data_url}
                            alt={`PDF Page ${pageNum}`}
                            className="w-full h-full object-contain pointer-events-none select-none rounded-lg"
                          />
                        </div>
                      ) : loadingPreviews ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                          <span className="text-xs text-muted-foreground font-medium">
                            Rendering PDF Page {pageNum}…
                          </span>
                        </div>
                      ) : (
                        /* Fallback outline */
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white p-6 text-center border-dashed border-2 border-slate-200">
                          <FileText className="h-10 w-10 text-slate-300 mb-2" />
                          <span className="text-xs font-semibold text-slate-400">Page {pageNum}</span>
                        </div>
                      )}

                      {/* 🔴 THE DYNAMIC RED DOT / NUMBER INDICATOR 🔴 */}
                      {isNumbered && (
                        <div
                          style={dotStyle}
                          className="z-20 transition-all duration-300 flex items-center justify-center pointer-events-none"
                        >
                          <div className="relative group/dot flex items-center justify-center pointer-events-auto">
                            <span className="h-4 w-4 rounded-full bg-rose-600 ring-4 ring-rose-500/30 shadow-md animate-pulse" />
                            {/* Number label tooltip */}
                            <span className="absolute -bottom-6 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono whitespace-nowrap shadow-sm opacity-90">
                              {displayText || evalNumber}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Zoom button on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <span className="p-1.5 rounded-full bg-slate-900/60 text-white flex items-center justify-center shadow">
                          <ZoomIn className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Page Number Footer Label */}
                    <span className="mt-2 text-xs font-semibold text-muted-foreground">
                      Page {pageNum}
                      {!isNumbered && " (No number)"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Instruction footnote */}
            <p className="mt-4 text-xs text-muted-foreground text-center">
              The red marker dynamically shows where numbers will be placed on each page.
            </p>
          </div>

          {/* ── RIGHT COLUMN: Page Number Options Sidebar ── */}
          <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-foreground border-b border-border/40 pb-3">
              Page Number options
            </h2>

            {/* 1. Page Mode: Single page vs Facing pages */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Page mode</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all",
                    pageMode === "single"
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="pageMode"
                    checked={pageMode === "single"}
                    onChange={() => setPageMode("single")}
                    className="accent-emerald-600 h-3.5 w-3.5"
                  />
                  <span>Single page</span>
                </label>

                <label
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all",
                    pageMode === "facing"
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="pageMode"
                    checked={pageMode === "facing"}
                    onChange={() => setPageMode("facing")}
                    className="accent-emerald-600 h-3.5 w-3.5"
                  />
                  <span>Facing pages</span>
                </label>
              </div>
            </div>

            {/* 2. Position Matrix & Margin Dropdown */}
            <div className="grid grid-cols-2 gap-4 items-start">
              {/* 3x3 Position Matrix */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Position:</label>
                <div className="h-[84px] w-[84px] border border-border rounded-lg grid grid-cols-3 grid-rows-3 p-1 bg-background/50 shadow-inner">
                  {MATRIX_CELLS.map((cell) => {
                    const isSelected = position === cell;
                    return (
                      <button
                        key={cell}
                        type="button"
                        onClick={() => setPosition(cell)}
                        className={cn(
                          "flex items-center justify-center border border-dashed border-border/40 hover:bg-accent/50 transition-all rounded-[3px]",
                          isSelected && "bg-rose-500/10"
                        )}
                        title={cell.replace("-", " ")}
                      >
                        {isSelected && (
                          <span className="h-3 w-3 rounded-full bg-rose-600 shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Margin Preset */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Margin:</label>
                <select
                  value={marginPreset}
                  onChange={(e) => setMarginPreset(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-input bg-background/50 px-3 text-xs font-medium focus:border-primary focus:outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="small">Small</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>

            {/* 3. Pages Section */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <label className="text-xs font-semibold text-foreground">Pages</label>

              {/* First number */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  First number:
                </span>
                <input
                  type="number"
                  min={1}
                  value={firstNumber}
                  onChange={(e) => setFirstNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 rounded-lg border border-input bg-background/50 px-3 py-1.5 text-xs font-medium text-right focus:border-primary focus:outline-none"
                />
              </div>

              {/* Which pages do you want to number? */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">
                  Which pages do you want to number?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-secondary/20 p-2 rounded-xl border border-border/50">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">from</span>
                    <input
                      type="number"
                      min={1}
                      value={fromPage}
                      onChange={(e) => setFromPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-transparent text-xs font-medium focus:outline-none text-right"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-secondary/20 p-2 rounded-xl border border-border/50">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">to</span>
                    <input
                      type="number"
                      min={fromPage}
                      value={toPage}
                      onChange={(e) => setToPage(Math.max(fromPage, parseInt(e.target.value, 10) || fromPage))}
                      className="w-full bg-transparent text-xs font-medium focus:outline-none text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Text & Format Section */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <label className="text-xs font-semibold text-foreground">Text:</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background/50 px-3 text-xs font-medium focus:border-primary focus:outline-none"
              >
                {TEXT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* If Custom chosen */}
              {selectedTemplateId === "custom" && (
                <div className="pt-1">
                  <Input
                    type="text"
                    value={customFormat}
                    onChange={(e) => setCustomFormat(e.target.value)}
                    placeholder="e.g. Doc #{n}"
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Use <code>{'{n}'}</code> for number and <code>{'{total}'}</code> for count.
                  </p>
                </div>
              )}

              {/* Text Format Controls: Font, Size, Styles, Color */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-muted-foreground">Text format:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Font dropdown */}
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background/50 px-2 text-xs font-medium focus:border-primary focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  {/* Font size */}
                  <input
                    type="number"
                    min={6}
                    max={72}
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.min(72, Math.max(6, parseInt(e.target.value, 10) || 10)))}
                    className="h-8 w-14 rounded-lg border border-input bg-background/50 px-2 text-xs font-medium text-center focus:border-primary focus:outline-none"
                  />

                  {/* B, I, U Buttons */}
                  <div className="flex items-center rounded-lg border border-input bg-background/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsBold((b) => !b)}
                      className={cn(
                        "p-1.5 hover:bg-accent transition-colors",
                        isBold && "bg-primary/20 text-primary font-bold"
                      )}
                      title="Bold"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsItalic((i) => !i)}
                      className={cn(
                        "p-1.5 hover:bg-accent transition-colors border-l border-input",
                        isItalic && "bg-primary/20 text-primary italic"
                      )}
                      title="Italic"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUnderline((u) => !u)}
                      className={cn(
                        "p-1.5 hover:bg-accent transition-colors border-l border-input",
                        isUnderline && "bg-primary/20 text-primary underline"
                      )}
                      title="Underline"
                    >
                      <Underline className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Color swatches */}
                  <div className="flex items-center gap-1 pl-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.rgb as any)}
                        className={cn(
                          "h-5 w-5 rounded-full border border-border shadow-sm transition-transform",
                          c.bg,
                          JSON.stringify(selectedColor) === JSON.stringify(c.rgb)
                            ? "ring-2 ring-primary scale-110"
                            : "opacity-75 hover:opacity-100"
                        )}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {serverError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {serverError}
              </p>
            )}

            {/* Big Action Button */}
            <Button
              size="lg"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 shadow-lg hover:shadow-rose-600/20 text-sm rounded-xl transition-all"
              disabled={processing || upload.isUploading}
              onClick={handleProcess}
            >
              {processing || upload.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {upload.isUploading ? "Uploading file…" : "Adding page numbers…"}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Add page numbers <span className="text-base">➔</span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
