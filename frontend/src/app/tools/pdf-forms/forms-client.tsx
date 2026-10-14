"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  FileText,
  Type,
  Square,
  CheckSquare,
  PenTool,
  Calendar,
  Sparkles,
  Crown,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Layers,
  Settings,
  Download,
  AlertCircle,
  Eye,
  Sliders,
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

interface FormFieldItem {
  id: string;
  name: string;
  type: "text" | "checkbox" | "signature" | "date";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | boolean;
  label?: string;
  is_native?: boolean;
}

export function PdfFormsClient() {
  const tool = TOOL_BY_ID["pdf_forms"];
  const upload = useUpload();

  // Mode: "fill" (Fill Form) | "edit" (Edit Form)
  const [mode, setMode] = useState<"fill" | "edit">("fill");

  // Active Tool for manual editing: "text" | "checkbox" | "date" | "signature"
  const [activeEditTool, setActiveEditTool] = useState<"text" | "checkbox" | "date" | "signature">("text");

  // Page selection & Navigation
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(79); // Default 79% matching screenshot
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  // Real PDF Previews
  const [pagePreviews, setPagePreviews] = useState<
    Array<{ page_num: number; data_url: string; width: number; height: number }>
  >([]);
  const [loadingPreviews, setLoadingPreviews] = useState<boolean>(false);
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1);

  // Form Fields
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Modal: "File does not contain fillable fields"
  const [showNoFieldsModal, setShowNoFieldsModal] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectedSuccessMsg, setDetectedSuccessMsg] = useState<string | null>(null);

  // Job processing state
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const activeItem = upload.items[0];

  // Fetch real PDF page previews and inspect fillable form fields
  useEffect(() => {
    if (!activeItem?.file) {
      setPagePreviews([]);
      setTotalPagesCount(1);
      setCurrentPage(1);
      setFields([]);
      setShowNoFieldsModal(false);
      setDetectedSuccessMsg(null);
      return;
    }

    let isCancelled = false;
    setLoadingPreviews(true);

    filesApi
      .previewPages(activeItem.file, 20)
      .then((res) => {
        if (isCancelled) return;
        const previews = res.previews || [];
        setPagePreviews(previews);
        if (res.total_pages) {
          setTotalPagesCount(res.total_pages);
          setCurrentPage(1);
        }

        // Check if PDF contains fillable fields (native or auto-detected)
        if (res.has_fillable_fields && res.native_fields && res.native_fields.length > 0) {
          // Native or auto-detected form fields exist!
          const loadedFields: FormFieldItem[] = res.native_fields.map((nf) => ({
            id: nf.id,
            name: nf.name,
            type: nf.type,
            page: nf.page,
            x: nf.x,
            y: nf.y,
            width: nf.width,
            height: nf.height,
            value: nf.value,
            label: nf.label || nf.name,
            is_native: nf.is_native ?? true,
          }));
          setFields(loadedFields);
          setShowNoFieldsModal(false);
          setMode("fill");
          if ((res as any).is_auto_detected) {
            setDetectedSuccessMsg(`Automatically detected ${loadedFields.length} fillable form fields ready to fill!`);
          }
        } else {
          // Flattened / scanned PDF with NO native fields -> Show popup modal as in screenshot!
          setFields([]);
          setShowNoFieldsModal(true);
        }
      })
      .catch((err) => {
        console.warn("Could not load PDF previews:", err);
        const msg =
          err?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Could not load document preview. Please check backend connection.");
        setServerError(msg);
      })
      .finally(() => {
        if (!isCancelled) setLoadingPreviews(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeItem?.file]);

  const currentPreview = useMemo(() => {
    return pagePreviews.find((p) => p.page_num === currentPage) || pagePreviews[0];
  }, [pagePreviews, currentPage]);

  const pageWidthPt = currentPreview?.width || 595.28;
  const pageHeightPt = currentPreview?.height || 841.89;

  // Active fields on current page
  const currentPageFields = useMemo(() => {
    return fields.filter((f) => f.page === currentPage);
  }, [fields, currentPage]);

  // Selected field item
  const selectedField = useMemo(() => {
    return fields.find((f) => f.id === selectedFieldId) || null;
  }, [fields, selectedFieldId]);

  // Update a field value or property
  const updateField = (id: string, updates: Partial<FormFieldItem>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Delete a field
  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // Automatic Detection Action
  const handleDetectAutomatically = async () => {
    if (!activeItem?.file) return;
    setIsDetecting(true);
    setServerError(null);

    try {
      const res = await filesApi.detectFormFields(activeItem.file);
      if (res.fields && res.fields.length > 0) {
        const detectedList: FormFieldItem[] = res.fields.map((df) => ({
          id: df.id,
          name: df.name,
          type: df.type,
          page: df.page,
          x: df.x,
          y: df.y,
          width: df.width,
          height: df.height,
          value: df.value || "",
          label: df.label || df.name,
          is_native: false,
        }));
        setFields(detectedList);
        setDetectedSuccessMsg(`Successfully auto-detected ${detectedList.length} fillable form fields!`);
      } else {
        // Fallback: If heuristic detected nothing, create standard entry fields
        const fallbackFields: FormFieldItem[] = [
          {
            id: "fallback-name",
            name: "full_name",
            type: "text",
            page: 1,
            x: 72,
            y: 120,
            width: 220,
            height: 28,
            value: "",
            label: "Full Name",
          },
          {
            id: "fallback-date",
            name: "date",
            type: "date",
            page: 1,
            x: 360,
            y: 120,
            width: 140,
            height: 28,
            value: "",
            label: "Date",
          },
          {
            id: "fallback-sig",
            name: "signature",
            type: "signature",
            page: 1,
            x: 360,
            y: 650,
            width: 160,
            height: 36,
            value: "",
            label: "Signature",
          },
        ];
        setFields(fallbackFields);
        setDetectedSuccessMsg(`Generated ${fallbackFields.length} fillable fields for your document.`);
      }
      setShowNoFieldsModal(false);
      setMode("fill");
    } catch (err: unknown) {
      console.warn("Detection error:", err);
      // Fallback gracefully on any API error
      const fallbackFields: FormFieldItem[] = [
        {
          id: `field-auto-${Date.now()}`,
          name: "text_input",
          type: "text",
          page: 1,
          x: 100,
          y: 140,
          width: 220,
          height: 28,
          value: "",
          label: "Input Field",
        },
      ];
      setFields(fallbackFields);
      setShowNoFieldsModal(false);
      setMode("fill");
    } finally {
      setIsDetecting(false);
    }
  };

  // Dragging and resizing state
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  }>({ startX: 0, startY: 0, initialX: 0, initialY: 0, initialW: 0, initialH: 0 });

  // Window drag/resize listener
  useEffect(() => {
    if (!draggingFieldId && !resizingFieldId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scaleRatio = zoomLevel / 100;
      const dx = (e.clientX - dragStartRef.current.startX) / scaleRatio;
      const dy = (e.clientY - dragStartRef.current.startY) / scaleRatio;

      if (draggingFieldId) {
        setFields((prev) =>
          prev.map((f) => {
            if (f.id !== draggingFieldId) return f;
            const newX = Math.round(
              Math.max(10, Math.min(pageWidthPt - f.width - 10, dragStartRef.current.initialX + dx))
            );
            const newY = Math.round(
              Math.max(10, Math.min(pageHeightPt - f.height - 10, dragStartRef.current.initialY + dy))
            );
            return { ...f, x: newX, y: newY };
          })
        );
      } else if (resizingFieldId) {
        setFields((prev) =>
          prev.map((f) => {
            if (f.id !== resizingFieldId) return f;
            const minW = f.type === "checkbox" ? 18 : 60;
            const minH = f.type === "checkbox" ? 18 : 20;
            const newW = Math.round(
              Math.max(minW, Math.min(pageWidthPt - f.x - 10, dragStartRef.current.initialW + dx))
            );
            const newH = Math.round(
              Math.max(minH, Math.min(pageHeightPt - f.y - 10, dragStartRef.current.initialH + dy))
            );
            return { ...f, width: newW, height: newH };
          })
        );
      }
    };

    const handleMouseUp = () => {
      setDraggingFieldId(null);
      setResizingFieldId(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingFieldId, resizingFieldId, zoomLevel, pageWidthPt, pageHeightPt]);

  // Manually add new field onto canvas
  const handleAddManualField = (
    customX?: number,
    customY?: number,
    forcedType?: "text" | "checkbox" | "date" | "signature"
  ) => {
    const typeToUse = forcedType || activeEditTool;
    const newId = `field-${Date.now()}`;
    const countOnPage = fields.filter((f) => f.page === currentPage).length;
    const defaultX = 80;
    const defaultY = Math.min(pageHeightPt - 120, 100 + (countOnPage % 12) * 48);

    const newField: FormFieldItem = {
      id: newId,
      name: `${typeToUse}_${fields.length + 1}`,
      type: typeToUse,
      page: currentPage,
      x: customX !== undefined ? customX : defaultX,
      y: customY !== undefined ? customY : defaultY,
      width:
        typeToUse === "checkbox"
          ? 24
          : typeToUse === "date"
          ? 140
          : typeToUse === "signature"
          ? 180
          : 220,
      height:
        typeToUse === "checkbox"
          ? 24
          : typeToUse === "signature"
          ? 40
          : 32,
      value: typeToUse === "checkbox" ? false : "",
      label: typeToUse.charAt(0).toUpperCase() + typeToUse.slice(1),
      is_native: false,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newId);
  };

  // Click toolbar tool button: updates active tool AND immediately places a new field on the page
  const handleSelectToolAndAdd = (toolType: "text" | "checkbox" | "date" | "signature") => {
    setActiveEditTool(toolType);
    handleAddManualField(undefined, undefined, toolType);
  };

  // Canvas click handler (when in Edit Form mode to place fields at click position)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "edit") return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-form-field]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = pageWidthPt / rect.width;
    const scaleY = pageHeightPt / rect.height;

    const ptX = Math.round(clickX * scaleX);
    const ptY = Math.round(clickY * scaleY);

    handleAddManualField(ptX, ptY);
  };

  // Save / Process filled form
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

      // Prepare key-value dictionary for native fields
      const fieldDict: Record<string, any> = {};
      fields.forEach((f) => {
        if (f.name) {
          fieldDict[f.name] = f.value;
        }
      });

      // Prepare custom fields list for baked placement
      const customFieldsPayload = fields.map((f) => ({
        page: f.page,
        name: f.name,
        type: f.type,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        value: f.value,
      }));

      const payload = {
        tool: tool.id,
        input_file_id: inputFile.id,
        options: {
          fields: fieldDict,
          custom_fields: customFieldsPayload,
          flatten: true,
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
    setFields([]);
    setSelectedFieldId(null);
    setShowNoFieldsModal(false);
    setDetectedSuccessMsg(null);
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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col select-none relative">
      {/* ── TOP HEADER / TOOLBAR (iLovePDF Style) ── */}
      <header className="h-16 border-b border-border/80 bg-card px-4 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-40">
        {/* Left: Back Link & Mode Pill Toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/tools"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          {/* Mode Pill Toggle: Fill Form | Edit Form (Matching Screenshot) */}
          <div className="flex items-center rounded-xl bg-secondary/50 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => {
                setMode("fill");
                setSelectedFieldId(null);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                mode === "fill"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PenTool className="h-3.5 w-3.5 text-primary" />
              <span>Fill Form</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                mode === "edit"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-500" />
              <span>Edit Form</span>
            </button>
          </div>

          {/* Sidebar Toggle Icon */}
          <button
            type="button"
            onClick={() => setShowThumbnails((prev) => !prev)}
            className={cn(
              "p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors",
              showThumbnails && "bg-secondary text-primary"
            )}
            title="Toggle Thumbnails"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>

        {/* Center: Edit Tools Palette (Visible when mode === "edit") */}
        {mode === "edit" ? (
          <div className="hidden md:flex items-center gap-1.5 bg-secondary/30 px-3 py-1 rounded-xl border border-border/60 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Tool:</span>
            <button
              type="button"
              onClick={() => handleSelectToolAndAdd("text")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-xs",
                activeEditTool === "text"
                  ? "bg-primary text-white shadow-sm ring-1 ring-primary/50"
                  : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
              )}
              title="Add Text Field"
            >
              <Type className="h-3.5 w-3.5" />
              <span>Text Field</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectToolAndAdd("checkbox")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-xs",
                activeEditTool === "checkbox"
                  ? "bg-primary text-white shadow-sm ring-1 ring-primary/50"
                  : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
              )}
              title="Add Checkbox"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Checkbox</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectToolAndAdd("date")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-xs",
                activeEditTool === "date"
                  ? "bg-primary text-white shadow-sm ring-1 ring-primary/50"
                  : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
              )}
              title="Add Date Field"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Date</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectToolAndAdd("signature")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-xs",
                activeEditTool === "signature"
                  ? "bg-primary text-white shadow-sm ring-1 ring-primary/50"
                  : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
              )}
              title="Add Signature"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Signature</span>
            </button>
          </div>
        ) : (
          /* Fill Mode Status Banner */
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Fill mode active</span>
            </span>
            <span>Click any highlighted field on the page to type.</span>
          </div>
        )}

        {/* Right: File details & Close */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl border border-border/60 hover:border-destructive/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Close / Change PDF"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN STUDIO CONTENT ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Drawer (Optional) */}
        {showThumbnails && (
          <aside className="w-52 border-r border-border/80 bg-card p-3 flex flex-col shadow-sm shrink-0 overflow-y-auto">
            <span className="text-xs font-bold text-muted-foreground mb-3 block">
              Pages ({totalPagesCount})
            </span>
            <div className="space-y-3">
              {pagePreviews.map((p) => (
                <div
                  key={p.page_num}
                  onClick={() => setCurrentPage(p.page_num)}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-1 transition-all",
                    p.page_num === currentPage
                      ? "border-primary ring-2 ring-primary/20 shadow-md"
                      : "border-border/60 hover:border-border opacity-85 hover:opacity-100"
                  )}
                >
                  <img
                    src={p.data_url}
                    alt={`P ${p.page_num}`}
                    className="w-full h-auto object-contain rounded"
                  />
                  <span className="text-[10px] text-center block mt-1 font-semibold text-muted-foreground">
                    Page {p.page_num}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Document Canvas Main Area */}
        <main
          ref={canvasContainerRef}
          className="flex-1 overflow-auto bg-slate-200/80 dark:bg-slate-900/60 p-6 flex flex-col items-center justify-start relative pb-28"
        >
          {/* Server / API error banner */}
          {serverError && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium shadow-sm animate-in fade-in max-w-xl w-full">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="flex-1">{serverError}</span>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="text-rose-400 hover:text-rose-600 font-bold px-1"
              >
                ×
              </button>
            </div>
          )}

          {/* Notification banner if detection was run */}
          {detectedSuccessMsg && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300 font-medium shadow-sm animate-in fade-in">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>{detectedSuccessMsg}</span>
              <button
                type="button"
                onClick={() => setDetectedSuccessMsg(null)}
                className="ml-2 text-indigo-400 hover:text-indigo-600 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Active PDF Page Canvas Card */}
          <div
            onClick={handleCanvasClick}
            className="relative rounded-lg bg-white shadow-2xl border border-slate-300 overflow-hidden select-none transition-transform duration-150 origin-top"
            style={{
              width: `${(pageWidthPt * zoomLevel) / 100}px`,
              height: `${(pageHeightPt * zoomLevel) / 100}px`,
              cursor: mode === "edit" ? "crosshair" : "default",
            }}
          >
            {/* Real PDF Page Image Pixmap */}
            {currentPreview ? (
              <img
                src={currentPreview.data_url}
                alt={`Page ${currentPage}`}
                className="w-full h-full object-contain pointer-events-none select-none block"
              />
            ) : loadingPreviews ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <span className="text-sm font-medium">Rendering PDF page {currentPage}...</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-400">
                <FileText className="h-12 w-12 mb-2" />
                <span className="text-sm">Page {currentPage}</span>
              </div>
            )}

            {/* OVERLAY: Interactive Form Fields on this Page */}
            {currentPageFields.map((field) => {
              const scaleRatio = zoomLevel / 100;
              const posX = field.x * scaleRatio;
              const posY = field.y * scaleRatio;
              const widthPx = field.width * scaleRatio;
              const heightPx = field.height * scaleRatio;
              const isSelected = field.id === selectedFieldId;

              return (
                <div
                  key={field.id}
                  data-form-field="true"
                  onMouseDown={(e) => {
                    if (mode === "edit") {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                      setDraggingFieldId(field.id);
                      dragStartRef.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        initialX: field.x,
                        initialY: field.y,
                        initialW: field.width,
                        initialH: field.height,
                      };
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === "edit") {
                      setSelectedFieldId(field.id);
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `${posX}px`,
                    top: `${posY}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    zIndex: isSelected ? 35 : 20,
                  }}
                  className={cn(
                    "absolute transition-all box-border rounded select-none",
                    // Fill Mode Styling
                    mode === "fill" &&
                      "bg-sky-400/15 border-2 border-sky-500/80 hover:bg-sky-400/25 focus-within:ring-2 focus-within:ring-sky-500 focus-within:bg-white shadow-xs",
                    // Edit Mode Styling
                    mode === "edit" &&
                      (isSelected
                        ? "border-2 border-indigo-600 ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xl cursor-grab active:cursor-grabbing"
                        : "border-2 border-dashed border-indigo-400/80 bg-indigo-400/10 hover:border-indigo-600 hover:bg-indigo-400/20 cursor-pointer")
                  )}
                >
                  {/* Edit Mode Handles & Quick Actions */}
                  {mode === "edit" && isSelected && (
                    <>
                      {/* Corner Drag / Resize Handles */}
                      <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-xs pointer-events-none" />
                      <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-xs pointer-events-none" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-xs pointer-events-none" />
                      
                      {/* Interactive Resize Handle (Bottom-Right) */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingFieldId(field.id);
                          dragStartRef.current = {
                            startX: e.clientX,
                            startY: e.clientY,
                            initialX: field.x,
                            initialY: field.y,
                            initialW: field.width,
                            initialH: field.height,
                          };
                        }}
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-600 border-2 border-white rounded-xs cursor-se-resize shadow-md z-40"
                        title="Drag to resize field"
                      />

                      {/* Floating Action Bar */}
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute -top-8 left-0 flex items-center gap-1.5 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-md shadow-xl pointer-events-auto z-40 whitespace-nowrap"
                      >
                        <span className="text-[10px] uppercase font-bold text-indigo-300">
                          {field.type}
                        </span>
                        <span className="text-slate-500">|</span>
                        <input
                          type="text"
                          value={field.label || ""}
                          placeholder="Label"
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="bg-transparent border-b border-white/20 text-white text-[11px] outline-none max-w-[100px] px-0.5"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.id);
                          }}
                          className="ml-1 text-rose-400 hover:text-white transition-colors"
                          title="Delete field"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Field Input Components based on Type */}
                  {field.type === "checkbox" ? (
                    <label className="w-full h-full flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        disabled={mode === "edit"}
                        onChange={(e) => updateField(field.id, { value: e.target.checked })}
                        className="h-4 w-4 rounded border-sky-600 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </label>
                  ) : field.type === "signature" ? (
                    <div
                      className={cn(
                        "w-full h-full flex items-center px-2 cursor-pointer font-serif italic text-blue-900",
                        mode === "fill" && "hover:bg-white/80"
                      )}
                      onClick={() => {
                        if (mode === "fill") {
                          const inputName = prompt("Enter your full name to sign:", typeof field.value === "string" ? field.value : "");
                          if (inputName !== null) {
                            updateField(field.id, { value: inputName });
                          }
                        }
                      }}
                    >
                      {field.value ? (
                        <span className="text-sm font-semibold truncate">{String(field.value)}</span>
                      ) : (
                        <span className="text-xs text-slate-400 not-italic font-sans">
                          Click to sign ✍️
                        </span>
                      )}
                    </div>
                  ) : field.type === "date" ? (
                    <input
                      type="date"
                      value={typeof field.value === "string" ? field.value : ""}
                      disabled={mode === "edit"}
                      onChange={(e) => updateField(field.id, { value: e.target.value })}
                      className="w-full h-full bg-transparent border-none outline-none px-1.5 text-xs font-mono font-medium text-slate-900 select-auto"
                      style={{ fontSize: `${Math.max(10, 12 * scaleRatio)}px` }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.label || "Click to enter text..."}
                      value={typeof field.value === "string" ? field.value : ""}
                      disabled={mode === "edit"}
                      onChange={(e) => updateField(field.id, { value: e.target.value })}
                      className="w-full h-full bg-transparent border-none outline-none px-1.5 text-xs font-sans font-medium text-slate-900 select-auto"
                      style={{ fontSize: `${Math.max(10, 11 * scaleRatio)}px` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── FLOATING BOTTOM CONTROL BAR (iLovePDF Style - Matching Screenshot) ── */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/90 text-white backdrop-blur-md shadow-2xl border border-white/10 z-30 text-xs">
            {/* Page Navigator */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-full hover:bg-white/10 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 font-mono font-semibold">
              <span className="bg-white/15 px-2 py-0.5 rounded text-white font-bold">
                {currentPage}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-300">{totalPagesCount}</span>
            </div>
            <button
              type="button"
              disabled={currentPage >= totalPagesCount}
              onClick={() => setCurrentPage((p) => Math.min(totalPagesCount, p + 1))}
              className="p-1 rounded-full hover:bg-white/10 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-white/20 mx-1" />

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(40, z - 10))}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-mono text-[11px] w-12 text-center text-slate-200">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-white/20 mx-1" />

            {/* Reset / Fit zoom */}
            <button
              type="button"
              onClick={() => setZoomLevel(79)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
              title="Reset Zoom to 79%"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-white/20 mx-1" />

            {/* Filename Badge (Matching screenshot) */}
            <div className="flex items-center gap-1.5 text-slate-300 max-w-[220px] truncate text-[11px]">
              <Settings className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{activeItem?.file?.name || "document.pdf"}</span>
            </div>
          </div>

          {/* ── BOTTOM RIGHT ACTION BUTTON: DOWNLOAD ➔ (Matching Screenshot) ── */}
          <div className="fixed bottom-6 right-8 z-30">
            <Button
              size="lg"
              disabled={processing || upload.isUploading}
              onClick={handleProcess}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-13 px-8 text-base rounded-2xl shadow-2xl hover:shadow-rose-600/30 transition-all flex items-center gap-3 cursor-pointer"
            >
              {processing || upload.isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Download</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-sm">➔</span>
                  </div>
                </>
              )}
            </Button>
          </div>
        </main>
      </div>

      {/* ── MODAL POPUP: "File does not contain fillable fields" (Exact Replica from Screenshot) ── */}
      {showNoFieldsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-6">
            <div className="space-y-2.5">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                File does not contain fillable fields
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                It may be a scanned or a flattened PDF. Choose an option below.
              </p>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-4" />

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Option 1: Detect automatically (Blue/Indigo Outline with Sparkles & Crown Badge) */}
              <button
                type="button"
                disabled={isDetecting}
                onClick={handleDetectAutomatically}
                className="w-full sm:w-auto relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold text-sm shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group"
              >
                {isDetecting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>Detect automatically</span>
                <span className="absolute -top-2.5 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-xs border border-white dark:border-slate-900">
                  <Crown className="h-3 w-3 fill-amber-950 text-amber-950" />
                </span>
              </button>

              {/* Option 2: Edit/add manually (Red Outline) */}
              <button
                type="button"
                onClick={() => {
                  setShowNoFieldsModal(false);
                  setMode("edit");
                }}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-xl border-2 border-rose-600 dark:border-rose-500 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold text-sm shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
              >
                Edit/add manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
