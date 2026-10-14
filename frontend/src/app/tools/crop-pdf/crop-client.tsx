"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  FileText,
  Crop,
  Sliders,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Link2,
  Link2Off,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/ui/tool-icon";
import { Dropzone } from "@/components/features/upload/dropzone";
import { JobResult } from "@/components/features/upload/job-result";
import { TOOL_BY_ID } from "@/config/tools";
import { useUpload } from "@/hooks/use-upload";
import { jobsApi, filesApi } from "@/lib/api/files";
import { cn } from "@/lib/utils/cn";
import type { FileRead } from "@/types/api";

const PRESETS = [
  { label: "Trim Margins (18 pt)", top: 18, bottom: 18, left: 18, right: 18 },
  { label: "Standard Crop (36 pt)", top: 36, bottom: 36, left: 36, right: 36 },
  { label: "Deep Crop (54 pt)", top: 54, bottom: 54, left: 54, right: 54 },
];

export function CropPdfClient() {
  const tool = TOOL_BY_ID["crop_pdf"];
  const upload = useUpload();

  // Pages mode: "all" vs "current"
  const [pageMode, setPageMode] = useState<"all" | "current">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 4-way Margins in points (1 inch = 72 pt)
  const [marginTop, setMarginTop] = useState<number>(36);
  const [marginBottom, setMarginBottom] = useState<number>(36);
  const [marginLeft, setMarginLeft] = useState<number>(36);
  const [marginRight, setMarginRight] = useState<number>(36);
  const [isLinked, setIsLinked] = useState<boolean>(true);

  // Live PDF Previews
  const [pagePreviews, setPagePreviews] = useState<
    Array<{ page_num: number; data_url: string; width: number; height: number }>
  >([]);
  const [loadingPreviews, setLoadingPreviews] = useState<boolean>(false);
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1);

  // Job & processing state
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const activeItem = upload.items[0];

  // Fetch real PDF page previews whenever a file is selected
  useEffect(() => {
    if (!activeItem?.file) {
      setPagePreviews([]);
      setTotalPagesCount(1);
      setCurrentPage(1);
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
          setCurrentPage(1);
        }
      })
      .catch((err) => {
        console.warn("Could not load PDF previews:", err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingPreviews(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeItem?.file]);

  // Apply preset
  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setMarginTop(preset.top);
    setMarginBottom(preset.bottom);
    setMarginLeft(preset.left);
    setMarginRight(preset.right);
  };

  const handleResetMargins = () => {
    setMarginTop(0);
    setMarginBottom(0);
    setMarginLeft(0);
    setMarginRight(0);
  };

  const updateMargin = (side: "top" | "bottom" | "left" | "right", val: number) => {
    const clamped = Math.max(0, Math.min(250, val));
    if (isLinked) {
      setMarginTop(clamped);
      setMarginBottom(clamped);
      setMarginLeft(clamped);
      setMarginRight(clamped);
    } else {
      if (side === "top") setMarginTop(clamped);
      if (side === "bottom") setMarginBottom(clamped);
      if (side === "left") setMarginLeft(clamped);
      if (side === "right") setMarginRight(clamped);
    }
  };

  // Currently viewed page preview object
  const currentPreview = useMemo(() => {
    return pagePreviews.find((p) => p.page_num === currentPage) || pagePreviews[0];
  }, [pagePreviews, currentPage]);

  // Calculate dynamic crop box percentages
  const pageWidthPt = currentPreview?.width || 595.28;
  const pageHeightPt = currentPreview?.height || 841.89;

  const topPct = Math.min(46, (marginTop / pageHeightPt) * 100);
  const bottomPct = Math.min(46, (marginBottom / pageHeightPt) * 100);
  const leftPct = Math.min(46, (marginLeft / pageWidthPt) * 100);
  const rightPct = Math.min(46, (marginRight / pageWidthPt) * 100);

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
          margin_top: Number(marginTop) || 0,
          margin_bottom: Number(marginBottom) || 0,
          margin_left: Number(marginLeft) || 0,
          margin_right: Number(marginRight) || 0,
          pages: pageMode === "all" ? "all" : String(currentPage),
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
    setTotalPagesCount(1);
    setCurrentPage(1);
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

  // If no file uploaded yet, show initial dropzone
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

  // Side-by-side interactive dynamic Crop Studio
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
              Interactive Crop Studio
            </span>
          </div>
        </div>

        {/* 2-Column Split: Left = Live Visual Document & Crop Mask | Right = Crop Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
          {/* ── LEFT COLUMN: Document Canvas & Live Dynamic Crop Box ── */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* File Header Bar */}
            <div className="w-full max-w-3xl flex items-center justify-between mb-4">
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

            {/* Page Navigation Toolbar (when multiple pages) */}
            {totalPagesCount > 1 && (
              <div className="w-full max-w-3xl flex items-center justify-between bg-card border border-border/80 rounded-xl px-4 py-2 mb-4 shadow-sm text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Viewing:</span>
                  <span className="font-semibold text-foreground">
                    Page {currentPage} of {totalPagesCount}
                  </span>
                  {pageMode === "current" && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Target Page for Crop
                    </span>
                  )}
                  {pageMode === "all" && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      All Pages will be Cropped
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-xs font-mono font-semibold">
                    {currentPage} / {totalPagesCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg"
                    disabled={currentPage >= totalPagesCount}
                    onClick={() => setCurrentPage((p) => Math.min(totalPagesCount, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Document Live Preview Canvas with Interactive Crop Box */}
            <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-slate-100/70 dark:bg-slate-900/40 p-6 sm:p-10 shadow-inner flex flex-col items-center justify-center min-h-[520px]">
              {/* Document Page Card with Dynamic Crop Overlay */}
              <div
                className="relative rounded-xl bg-white shadow-2xl border border-slate-300 overflow-hidden select-none transition-all"
                style={{
                  width: "100%",
                  maxWidth: "460px",
                  aspectRatio: `${pageWidthPt} / ${pageHeightPt}`,
                }}
              >
                {/* 1. Real PDF Page Image */}
                {currentPreview ? (
                  <img
                    src={currentPreview.data_url}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain pointer-events-none select-none block"
                  />
                ) : loadingPreviews ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Rendering page {currentPage} preview…
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-2" />
                    <span className="text-xs font-medium text-slate-400">Page {currentPage}</span>
                  </div>
                )}

                {/* 2. DYNAMIC CROP OVERLAY BOX */}
                <div
                  className="absolute pointer-events-none transition-all duration-150 z-20"
                  style={{
                    top: `${topPct}%`,
                    bottom: `${bottomPct}%`,
                    left: `${leftPct}%`,
                    right: `${rightPct}%`,
                    /* Classic infinite box-shadow mask to dim the trimmed outer margins */
                    boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
                  }}
                >
                  {/* Glowing Crop Border */}
                  <div className="w-full h-full border-2 border-dashed border-rose-500 relative flex items-center justify-center">
                    {/* Dimension Badge in Center */}
                    <div className="px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm text-white text-[11px] font-mono font-semibold shadow-md pointer-events-auto border border-white/10 flex items-center gap-1.5">
                      <Crop className="h-3 w-3 text-rose-400" />
                      <span>
                        Kept Area:{" "}
                        {Math.round(Math.max(0, pageWidthPt - marginLeft - marginRight))} ×{" "}
                        {Math.round(Math.max(0, pageHeightPt - marginTop - marginBottom))} pt
                      </span>
                    </div>

                    {/* Corner Handles */}
                    <span className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-sm bg-rose-600 border border-white shadow" />
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm bg-rose-600 border border-white shadow" />
                    <span className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 rounded-sm bg-rose-600 border border-white shadow" />
                    <span className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm bg-rose-600 border border-white shadow" />

                    {/* Edge Middle Grips */}
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-6 rounded bg-rose-600 border border-white" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-6 rounded bg-rose-600 border border-white" />
                    <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 rounded bg-rose-600 border border-white" />
                    <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 rounded bg-rose-600 border border-white" />
                  </div>
                </div>

                {/* Shaded margin indicators */}
                {marginTop > 0 && (
                  <div
                    className="absolute top-0 left-0 right-0 flex items-center justify-center text-[10px] font-bold text-rose-200 pointer-events-none z-30"
                    style={{ height: `${topPct}%` }}
                  >
                    <span>▲ -{Math.round(marginTop)} pt</span>
                  </div>
                )}
                {marginBottom > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-center text-[10px] font-bold text-rose-200 pointer-events-none z-30"
                    style={{ height: `${bottomPct}%` }}
                  >
                    <span>▼ -{Math.round(marginBottom)} pt</span>
                  </div>
                )}
                {marginLeft > 0 && (
                  <div
                    className="absolute top-0 bottom-0 left-0 flex items-center justify-center text-[10px] font-bold text-rose-200 pointer-events-none z-30"
                    style={{ width: `${leftPct}%` }}
                  >
                    <span className="-rotate-90">◀ -{Math.round(marginLeft)} pt</span>
                  </div>
                )}
                {marginRight > 0 && (
                  <div
                    className="absolute top-0 bottom-0 right-0 flex items-center justify-center text-[10px] font-bold text-rose-200 pointer-events-none z-30"
                    style={{ width: `${rightPct}%` }}
                  >
                    <span className="rotate-90">▶ -{Math.round(marginRight)} pt</span>
                  </div>
                )}
              </div>

              {/* Bottom Instructions */}
              <p className="mt-4 text-xs text-muted-foreground text-center">
                The highlighted box dynamically shows the area that will be retained. Dimmed
                margins will be trimmed away.
              </p>
            </div>

            {/* Multi-page Thumbnail Strip (if document has > 1 page) */}
            {totalPagesCount > 1 && (
              <div className="w-full max-w-3xl mt-4 flex items-center gap-3 overflow-x-auto pb-2">
                {pagePreviews.map((p) => {
                  const isSelected = p.page_num === currentPage;
                  return (
                    <button
                      key={p.page_num}
                      type="button"
                      onClick={() => setCurrentPage(p.page_num)}
                      className={cn(
                        "relative flex-shrink-0 w-16 h-22 rounded-lg border-2 p-1 bg-white transition-all text-left group overflow-hidden shadow-sm",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 scale-105"
                          : "border-border/60 hover:border-border opacity-70 hover:opacity-100"
                      )}
                    >
                      <img
                        src={p.data_url}
                        alt={`Thumb ${p.page_num}`}
                        className="w-full h-full object-contain pointer-events-none rounded"
                      />
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-slate-900/80 text-[9px] text-white font-mono">
                        {p.page_num}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Crop Options Sidebar ── */}
          <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-foreground border-b border-border/40 pb-3 flex items-center justify-between">
              <span>Crop options</span>
              <button
                type="button"
                onClick={handleResetMargins}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                title="Reset margins to 0"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </h2>

            {/* 1. Pages Selection: "All pages" vs "Current page" */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Pages:</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all",
                    pageMode === "all"
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="cropPageMode"
                    checked={pageMode === "all"}
                    onChange={() => setPageMode("all")}
                    className="accent-emerald-600 h-3.5 w-3.5"
                  />
                  <span>All pages</span>
                </label>

                <label
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all",
                    pageMode === "current"
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                      : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="cropPageMode"
                    checked={pageMode === "current"}
                    onChange={() => setPageMode("current")}
                    className="accent-emerald-600 h-3.5 w-3.5"
                  />
                  <span>Current page</span>
                </label>
              </div>

              {pageMode === "current" && (
                <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                  <span>
                    Cropping <strong>Page {currentPage}</strong> only.
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-mono text-xs">{currentPage}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={currentPage >= totalPagesCount}
                      onClick={() => setCurrentPage((p) => Math.min(totalPagesCount, p + 1))}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Quick Presets */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Quick Presets</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const isMatch =
                    marginTop === p.top &&
                    marginBottom === p.bottom &&
                    marginLeft === p.left &&
                    marginRight === p.right;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "rounded-xl border p-2 text-[11px] font-semibold transition-all text-center",
                        isMatch
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border/60 hover:border-primary/40 hover:bg-secondary/40 text-muted-foreground"
                      )}
                    >
                      {p.label.split("(")[0]}
                      <span className="block text-[10px] font-mono text-muted-foreground">
                        ({p.top} pt)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Trim Margins (Points) Controls */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Crop className="h-3.5 w-3.5 text-primary" />
                  <span>Trim Margins (Points)</span>
                </div>
                {/* Link toggle */}
                <button
                  type="button"
                  onClick={() => setIsLinked((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors",
                    isLinked
                      ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                  title={isLinked ? "Unlink margins" : "Link margins to change equally"}
                >
                  {isLinked ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
                  <span>{isLinked ? "Linked" : "Independent"}</span>
                </button>
              </div>

              {/* 4 Inputs with quick steppers */}
              <div className="grid grid-cols-2 gap-3">
                {/* Top */}
                <div className="space-y-1 bg-secondary/20 p-2.5 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Top</span>
                    <span className="font-mono text-[11px]">{marginTop} pt</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={2}
                    value={marginTop}
                    onChange={(e) => updateMargin("top", parseFloat(e.target.value) || 0)}
                    className="w-full accent-rose-600 h-1.5 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={250}
                    value={marginTop}
                    onChange={(e) => updateMargin("top", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-input bg-background/50 px-2 py-1 text-xs font-mono text-right focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Bottom */}
                <div className="space-y-1 bg-secondary/20 p-2.5 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Bottom</span>
                    <span className="font-mono text-[11px]">{marginBottom} pt</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={2}
                    value={marginBottom}
                    onChange={(e) => updateMargin("bottom", parseFloat(e.target.value) || 0)}
                    className="w-full accent-rose-600 h-1.5 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={250}
                    value={marginBottom}
                    onChange={(e) => updateMargin("bottom", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-input bg-background/50 px-2 py-1 text-xs font-mono text-right focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Left */}
                <div className="space-y-1 bg-secondary/20 p-2.5 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Left</span>
                    <span className="font-mono text-[11px]">{marginLeft} pt</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={2}
                    value={marginLeft}
                    onChange={(e) => updateMargin("left", parseFloat(e.target.value) || 0)}
                    className="w-full accent-rose-600 h-1.5 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={250}
                    value={marginLeft}
                    onChange={(e) => updateMargin("left", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-input bg-background/50 px-2 py-1 text-xs font-mono text-right focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Right */}
                <div className="space-y-1 bg-secondary/20 p-2.5 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Right</span>
                    <span className="font-mono text-[11px]">{marginRight} pt</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={2}
                    value={marginRight}
                    onChange={(e) => updateMargin("right", parseFloat(e.target.value) || 0)}
                    className="w-full accent-rose-600 h-1.5 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={250}
                    value={marginRight}
                    onChange={(e) => updateMargin("right", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-input bg-background/50 px-2 py-1 text-xs font-mono text-right focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {serverError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {serverError}
              </p>
            )}

            {/* Action Button */}
            <Button
              size="lg"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 shadow-lg hover:shadow-rose-600/20 text-sm rounded-xl transition-all"
              disabled={processing || upload.isUploading}
              onClick={handleProcess}
            >
              {processing || upload.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {upload.isUploading ? "Uploading file…" : "Cropping PDF…"}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Crop className="h-4 w-4" />
                  Crop PDF {pageMode === "current" ? `(Page ${currentPage})` : "(All pages)"} ➔
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
