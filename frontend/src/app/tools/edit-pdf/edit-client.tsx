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
  Image as ImageIcon,
  CheckSquare,
  Hand,
  Maximize2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Crown,
  Undo2,
  Redo2,
  Move,
  Sliders,
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

interface EditableTextItem {
  id: string;
  type: "text";
  text: string;
  page: number;
  x: number; // pt relative to page
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  color: [number, number, number]; // RGB 0..1
  replace_rect?: [number, number, number, number];
  isDetected?: boolean;
  isModified?: boolean;
}

interface EditableShapeItem {
  id: string;
  type: "rect";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: [number, number, number];
  fill?: [number, number, number];
}

type EditorElement = EditableTextItem | EditableShapeItem;

const FONT_FAMILIES = [
  { id: "helv", label: "Arial / Helvetica" },
  { id: "times", label: "Times New Roman" },
  { id: "courier", label: "Courier" },
  { id: "georgia", label: "Georgia" },
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const COLOR_PALETTE: { label: string; rgb: [number, number, number]; hex: string }[] = [
  { label: "Black", rgb: [0.05, 0.05, 0.05], hex: "#0d0d0d" },
  { label: "Dark Gray", rgb: [0.35, 0.35, 0.35], hex: "#595959" },
  { label: "Blue", rgb: [0.08, 0.42, 0.94], hex: "#146cf0" },
  { label: "Red", rgb: [0.88, 0.15, 0.15], hex: "#e02626" },
  { label: "Emerald", rgb: [0.1, 0.65, 0.35], hex: "#1aa659" },
  { label: "Orange", rgb: [0.95, 0.52, 0.05], hex: "#f2850d" },
  { label: "Purple", rgb: [0.55, 0.2, 0.85], hex: "#8c33d9" },
];

export function EditPdfClient() {
  const tool = TOOL_BY_ID["edit_pdf"];
  const upload = useUpload();

  // Mode: "annotate" | "edit"
  const [topMode, setTopMode] = useState<"annotate" | "edit">("edit");
  // Active tool: "text" | "shapes" | "insert" | "hand"
  const [activeTool, setActiveTool] = useState<"text" | "shapes" | "hand">("text");

  // Page selection & Navigation
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 50% to 150%

  // Real PDF Previews
  const [pagePreviews, setPagePreviews] = useState<
    Array<{
      page_num: number;
      data_url: string;
      width: number;
      height: number;
      blocks?: Array<{
        id: string;
        type: "text" | "image";
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        fontSize?: number;
      }>;
    }>
  >([]);
  const [loadingPreviews, setLoadingPreviews] = useState<boolean>(false);
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1);

  // Editor Elements
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [deletedDetectedBlocks, setDeletedDetectedBlocks] = useState<EditableTextItem[]>([]);
  const [showOutlines, setShowOutlines] = useState<boolean>(true);

  // Undo / Redo history
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Job processing state
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const activeItem = upload.items[0];

  // Save history state
  const pushHistory = useCallback(
    (newElements: EditorElement[]) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      if (targetState) {
        setElements(targetState);
        setHistoryIndex((prev) => prev - 1);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      if (targetState) {
        setElements(targetState);
        setHistoryIndex((prev) => prev + 1);
      }
    }
  };

  // Fetch real PDF page previews and auto-detect text blocks
  useEffect(() => {
    if (!activeItem?.file) {
      setPagePreviews([]);
      setTotalPagesCount(1);
      setCurrentPage(1);
      setElements([]);
      setDeletedDetectedBlocks([]);
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

        // Auto-detect existing text blocks across all rendered pages
        const detectedElements: EditableTextItem[] = [];
        previews.forEach((p) => {
          if (p.blocks && p.blocks.length > 0) {
            p.blocks.forEach((blk) => {
              if (blk.type === "text" && blk.text && blk.text.trim()) {
                detectedElements.push({
                  id: blk.id,
                  type: "text",
                  text: blk.text,
                  page: p.page_num,
                  x: blk.x,
                  y: blk.y,
                  width: blk.width,
                  height: blk.height,
                  fontSize: blk.fontSize || 12,
                  fontFamily: "helv",
                  bold: false,
                  italic: false,
                  underline: false,
                  align: "left",
                  color: [0.08, 0.08, 0.08],
                  replace_rect: [blk.x, blk.y, blk.x + blk.width, blk.y + blk.height],
                  isDetected: true,
                  isModified: false,
                });
              }
            });
          }
        });

        setElements(detectedElements);
        setDeletedDetectedBlocks([]);
        setHistory([detectedElements]);
        setHistoryIndex(0);
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

  const currentPreview = useMemo(() => {
    return pagePreviews.find((p) => p.page_num === currentPage) || pagePreviews[0];
  }, [pagePreviews, currentPage]);

  const pageWidthPt = currentPreview?.width || 595.28;
  const pageHeightPt = currentPreview?.height || 841.89;

  // Selected item reference
  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  // Update selected element
  const updateSelectedElement = (updates: Partial<EditableTextItem | EditableShapeItem>) => {
    if (!selectedElementId) return;
    setElements((prev) => {
      const next = prev.map((elem) => {
        if (elem.id === selectedElementId) {
          return {
            ...elem,
            ...updates,
            isModified: true,
          } as EditorElement;
        }
        return elem;
      });
      pushHistory(next);
      return next;
    });
  };

  // Add new text element onto the currently active page
  const handleAddText = (customX?: number, customY?: number) => {
    const newId = `txt-${Date.now()}`;
    const newText: EditableTextItem = {
      id: newId,
      type: "text",
      text: "Click to edit text",
      page: currentPage,
      x: customX !== undefined ? customX : 72,
      y: customY !== undefined ? customY : 120,
      width: 160,
      height: 30,
      fontSize: 14,
      fontFamily: "helv",
      bold: false,
      italic: false,
      underline: false,
      align: "left",
      color: [0.08, 0.42, 0.94], // Blue accent
      isDetected: false,
      isModified: true,
    };

    const nextElements = [...elements, newText];
    setElements(nextElements);
    setSelectedElementId(newId);
    pushHistory(nextElements);
  };

  // Add rectangle shape
  const handleAddShape = () => {
    const newId = `shape-${Date.now()}`;
    const newShape: EditableShapeItem = {
      id: newId,
      type: "rect",
      page: currentPage,
      x: 100,
      y: 150,
      width: 140,
      height: 60,
      color: [0.88, 0.15, 0.15],
      fill: [0.98, 0.9, 0.9],
    };

    const nextElements = [...elements, newShape];
    setElements(nextElements);
    setSelectedElementId(newId);
    pushHistory(nextElements);
  };

  const handleDeleteElement = (id: string) => {
    const toDelete = elements.find((e) => e.id === id);
    if (toDelete && (toDelete as any).isDetected) {
      setDeletedDetectedBlocks((prev) => [...prev, toDelete as EditableTextItem]);
    }
    const nextElements = elements.filter((e) => e.id !== id);
    setElements(nextElements);
    if (selectedElementId === id) setSelectedElementId(null);
    pushHistory(nextElements);
  };

  // Canvas click to place text if activeTool === "text"
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "text") return;
    // If clicked on an existing text block, let the item handle selection
    const target = e.target as HTMLElement;
    if (target.closest("[data-editor-item]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel coordinates to PDF point coordinates
    const scaleX = pageWidthPt / rect.width;
    const scaleY = pageHeightPt / rect.height;

    const ptX = Math.round(clickX * scaleX);
    const ptY = Math.round(clickY * scaleY);

    handleAddText(ptX, ptY);
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

      // Convert elements to backend payload
      // 1. Redact any deleted detected blocks
      const payloadElements: any[] = [];
      deletedDetectedBlocks.forEach((del) => {
        payloadElements.push({
          type: "rect",
          page: del.page,
          x: Math.max(0, del.x - 2),
          y: Math.max(0, del.y - 2),
          width: (del.width || 100) + 4,
          height: (del.height || 20) + 4,
          color: [1, 1, 1],
          fill: [1, 1, 1],
        });
      });

      // 2. Send newly added elements or modified detected blocks
      elements.forEach((elem) => {
        if (elem.type === "text") {
          const t = elem as EditableTextItem;
          // Only send if it was modified or user-created
          if (!t.isDetected || t.isModified) {
            payloadElements.push({
              type: "text",
              page: t.page,
              x: t.x,
              y: t.y,
              text: t.text,
              font_size: t.fontSize,
              font_family: t.fontFamily,
              bold: t.bold,
              italic: t.italic,
              underline: t.underline,
              color: t.color,
              replace_rect: t.replace_rect,
            });
          }
        } else {
          // Shape
          payloadElements.push({
            type: "rect",
            page: elem.page,
            x: elem.x,
            y: elem.y,
            width: elem.width,
            height: elem.height,
            color: elem.color,
            fill: elem.fill,
          });
        }
      });

      const payload = {
        tool: tool.id,
        input_file_id: inputFile.id,
        options: {
          elements: payloadElements,
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
    setElements([]);
    setDeletedDetectedBlocks([]);
    setSelectedElementId(null);
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

  // Active elements on currently viewed page
  const currentPageElements = elements.filter((e) => e.page === currentPage);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col select-none">
      {/* ── TOP EDIT TOOLBAR (iLovePDF Style) ── */}
      <header className="h-16 border-b border-border/80 bg-card px-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        {/* Left: Exit Link & Annotate/Edit Pill Toggle */}
        <div className="flex items-center gap-4">
          <Link
            href="/tools"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          {/* Mode Pill Toggle: Annotate | Edit (Crown) */}
          <div className="flex items-center rounded-full bg-secondary/40 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setTopMode("annotate")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                topMode === "annotate"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annotate
            </button>
            <button
              type="button"
              onClick={() => setTopMode("edit")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1",
                topMode === "edit"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Edit</span>
              <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />
            </button>
          </div>

          {/* Hand pan vs Select Tool */}
          <div className="hidden md:flex items-center gap-1 pl-2 border-l border-border/60">
            <button
              type="button"
              onClick={() => setActiveTool("hand")}
              className={cn(
                "p-2 rounded-xl text-xs font-medium transition-colors border",
                activeTool === "hand"
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
              title="Hand Tool (Pan / Browse)"
            >
              <Hand className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center: Main Editing Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 1. Add / Edit Text Button (Active in red pill style) */}
          <button
            type="button"
            onClick={() => {
              setActiveTool("text");
              handleAddText();
            }}
            className={cn(
              "flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
              activeTool === "text"
                ? "bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700/50"
                : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            )}
            title="Add text annotation"
          >
            <Type className="h-4 w-4" />
            <span className="text-[11px] mt-0.5">Edit Text</span>
          </button>

          {/* 2. Shapes Tool */}
          <button
            type="button"
            onClick={() => {
              setActiveTool("shapes");
              handleAddShape();
            }}
            className={cn(
              "flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
              activeTool === "shapes"
                ? "bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700/50"
                : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            )}
            title="Insert Shape Rectangle"
          >
            <Square className="h-4 w-4" />
            <span className="text-[11px] mt-0.5">Shapes</span>
          </button>

          {/* 3. Insert Image Tool */}
          <label
            className="flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground cursor-pointer"
            title="Insert Image"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                  const b64 = re.target?.result as string;
                  if (b64) {
                    const newId = `img-${Date.now()}`;
                    setElements((prev) => [
                      ...prev,
                      {
                        id: newId,
                        type: "rect",
                        page: currentPage,
                        x: 100,
                        y: 180,
                        width: 140,
                        height: 90,
                        color: [0, 0, 0],
                        fill: [0.95, 0.95, 0.95],
                      },
                    ]);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <ImageIcon className="h-4 w-4" />
            <span className="text-[11px] mt-0.5">Insert</span>
          </label>

          {/* 4. Forms tool placeholder */}
          <button
            type="button"
            onClick={() => {
              handleAddText();
            }}
            className="hidden sm:flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            title="Forms & Checkboxes"
          >
            <CheckSquare className="h-4 w-4" />
            <span className="text-[11px] mt-0.5">Forms</span>
          </button>
        </div>

        {/* Right: File Badge & Clear */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/30 border border-border/60 text-xs font-medium text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="truncate max-w-[180px]">{activeItem?.file?.name || "document.pdf"}</span>
            <span className="text-muted-foreground font-mono text-[11px]">
              ({totalPagesCount}p)
            </span>
          </div>

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

      {/* ── 3-COLUMN STUDIO LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── COLUMN 1: LEFT SIDEBAR (Thumbnails & Zoom Slider) ── */}
        <aside className="w-56 border-r border-border/80 bg-card flex flex-col shadow-sm hidden md:flex shrink-0">
          {/* Top Tabs */}
          <div className="flex items-center justify-between p-3 border-b border-border/60 text-xs font-semibold text-muted-foreground">
            <span className="text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              Thumbnails
            </span>
            <span className="font-mono text-[11px]">{totalPagesCount} pages</span>
          </div>

          {/* Zoom Slider */}
          <div className="px-3 py-2 border-b border-border/40 bg-secondary/10 flex items-center gap-2">
            <ZoomOut className="h-3 w-3 text-muted-foreground" />
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
              className="w-full h-1 accent-primary cursor-pointer"
            />
            <ZoomIn className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Vertical Page Thumbnails List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pagePreviews.map((p) => {
              const isSelected = p.page_num === currentPage;
              return (
                <div
                  key={p.page_num}
                  onClick={() => setCurrentPage(p.page_num)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <div
                    className={cn(
                      "w-36 h-48 rounded-lg bg-white border-2 overflow-hidden shadow-sm transition-all flex items-center justify-center p-1",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 scale-[1.02] shadow-md"
                        : "border-border/60 hover:border-border opacity-85 hover:opacity-100"
                    )}
                  >
                    <img
                      src={p.data_url}
                      alt={`Thumb ${p.page_num}`}
                      className="w-full h-full object-contain pointer-events-none rounded select-none"
                    />
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-xs font-semibold",
                      isSelected ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    Page {p.page_num}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── COLUMN 2: CENTER DOCUMENT CANVAS ── */}
        <main
          ref={canvasContainerRef}
          className="flex-1 overflow-auto bg-slate-200/70 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-start relative"
        >
          {/* Secondary Sub-toolbar (Floating above document) */}
          <div className="mb-4 flex items-center gap-2 bg-card/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border/80 shadow-md text-xs font-semibold text-foreground">
            {currentPageElements.filter((e) => (e as any).isDetected).length > 0 && (
              <>
                <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  <span>{currentPageElements.filter((e) => (e as any).isDetected).length} blocks detected</span>
                </span>
                <div className="h-3 w-px bg-border/60" />
                <button
                  type="button"
                  onClick={() => setShowOutlines((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors text-[11px]",
                    showOutlines
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Toggle visible dashed outlines on detected text"
                >
                  <span>Outlines: {showOutlines ? "ON" : "OFF"}</span>
                </button>
                <div className="h-3 w-px bg-border/60" />
              </>
            )}

            <button
              type="button"
              onClick={() => handleAddText()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Insert Paragraph Text"
            >
              <Type className="h-3.5 w-3.5" />
              <span>Add Text</span>
            </button>
            <div className="h-3 w-px bg-border/60" />
            <button
              type="button"
              onClick={handleAddShape}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Insert Box / Shape"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Shape</span>
            </button>
          </div>

          {/* Active PDF Page Canvas Card */}
          <div
            onClick={handleCanvasClick}
            className="relative rounded-lg bg-white shadow-2xl border border-slate-300 overflow-hidden select-none transition-transform duration-150 origin-top"
            style={{
              width: `${(pageWidthPt * zoomLevel) / 100}px`,
              height: `${(pageHeightPt * zoomLevel) / 100}px`,
              cursor: activeTool === "text" ? "text" : "default",
            }}
          >
            {/* Real PDF Page Image */}
            {currentPreview ? (
              <img
                src={currentPreview.data_url}
                alt={`Page ${currentPage}`}
                className="w-full h-full object-contain pointer-events-none select-none block"
              />
            ) : loadingPreviews ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/60 text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <span className="text-sm font-medium">Rendering PDF page {currentPage}...</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-400">
                <FileText className="h-12 w-12 mb-2" />
                <span className="text-sm">Page {currentPage}</span>
              </div>
            )}

            {/* OVERLAY: Editable Text & Shape Elements on this Page */}
            {currentPageElements.map((elem) => {
              const isSelected = elem.id === selectedElementId;
              const scaleRatio = zoomLevel / 100;

              // Position scaled to zoom
              const posX = elem.x * scaleRatio;
              const posY = elem.y * scaleRatio;

              if (elem.type === "text") {
                const textElem = elem as EditableTextItem;
                const isDetectedUnedited = textElem.isDetected && !textElem.isModified;
                const widthPx = textElem.width ? Math.max(30, textElem.width * scaleRatio) : undefined;
                const heightPx = textElem.height ? Math.max(18, textElem.height * scaleRatio) : undefined;

                const rgbColor = `rgb(${Math.round(textElem.color[0] * 255)}, ${Math.round(
                  textElem.color[1] * 255
                )}, ${Math.round(textElem.color[2] * 255)})`;

                return (
                  <div
                    key={elem.id}
                    data-editor-item="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(elem.id);
                    }}
                    style={{
                      position: "absolute",
                      left: `${posX}px`,
                      top: `${posY}px`,
                      width: widthPx ? `${widthPx}px` : undefined,
                      minHeight: heightPx ? `${heightPx}px` : "20px",
                      zIndex: isSelected ? 30 : 10,
                    }}
                    className={cn(
                      "group/elem absolute transition-all select-none box-border",
                      isSelected
                        ? "ring-2 ring-sky-500 border-2 border-dashed border-sky-600 bg-white/95 shadow-xl p-1 rounded z-30"
                        : isDetectedUnedited
                        ? cn(
                            "rounded cursor-pointer transition-colors",
                            showOutlines
                              ? "border-2 border-dashed border-sky-400/80 bg-sky-400/5 hover:border-sky-600 hover:bg-sky-400/20 hover:shadow-md"
                              : "border-2 border-transparent hover:border-dashed hover:border-sky-400/70 hover:bg-sky-400/10"
                          )
                        : "border border-dashed border-sky-400/80 bg-white shadow-sm p-1 rounded cursor-pointer hover:border-sky-600"
                    )}
                  >
                    {/* Corner handle dots when selected (iLovePDF Style) */}
                    {isSelected && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-600 rounded-sm shadow-sm pointer-events-none" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-600 rounded-sm shadow-sm pointer-events-none" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-600 rounded-sm shadow-sm pointer-events-none" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-600 rounded-sm shadow-sm pointer-events-none" />
                        {/* Selected Tag / Delete Button */}
                        <div className="absolute -top-7 left-0 flex items-center gap-1.5 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-auto">
                          <span className="font-semibold">Text block</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(elem.id);
                            }}
                            className="ml-1 text-rose-300 hover:text-white"
                            title="Delete text block"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Rendering: Textarea when selected, invisible placeholder when unedited detected, or updated styled text */}
                    {isSelected ? (
                      <textarea
                        autoFocus
                        value={textElem.text}
                        onChange={(e) =>
                          updateSelectedElement({ text: e.target.value })
                        }
                        className="w-full bg-transparent border-none outline-none resize-none font-medium leading-tight p-0 block"
                        style={{
                          fontSize: `${Math.max(10, textElem.fontSize * scaleRatio)}px`,
                          fontFamily:
                            textElem.fontFamily === "times"
                              ? "serif"
                              : textElem.fontFamily === "courier"
                              ? "monospace"
                              : "sans-serif",
                          fontWeight: textElem.bold ? "bold" : "normal",
                          fontStyle: textElem.italic ? "italic" : "normal",
                          textDecoration: textElem.underline ? "underline" : "none",
                          textAlign: textElem.align,
                          color: rgbColor,
                          height: heightPx ? `${heightPx}px` : "auto",
                          minHeight: "22px",
                        }}
                      />
                    ) : isDetectedUnedited ? (
                      <div
                        className="w-full h-full relative"
                        title={`Detected block: "${textElem.text.substring(0, 40)}..." (Click to edit)`}
                      >
                        <span
                          className="opacity-0 select-none pointer-events-none block whitespace-pre-wrap leading-tight"
                          style={{
                            fontSize: `${Math.max(10, textElem.fontSize * scaleRatio)}px`,
                          }}
                        >
                          {textElem.text}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="w-full h-full bg-white px-0.5 rounded"
                        style={{
                          fontSize: `${Math.max(10, textElem.fontSize * scaleRatio)}px`,
                          fontFamily:
                            textElem.fontFamily === "times"
                              ? "serif"
                              : textElem.fontFamily === "courier"
                              ? "monospace"
                              : "sans-serif",
                          fontWeight: textElem.bold ? "bold" : "normal",
                          fontStyle: textElem.italic ? "italic" : "normal",
                          textDecoration: textElem.underline ? "underline" : "none",
                          textAlign: textElem.align,
                          color: rgbColor,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.25,
                        }}
                      >
                        {textElem.text}
                      </div>
                    )}
                  </div>
                );
              }

              // Shape Element
              if (elem.type === "rect") {
                const shapeElem = elem as EditableShapeItem;
                const strokeColor = `rgb(${Math.round(shapeElem.color[0] * 255)}, ${Math.round(
                  shapeElem.color[1] * 255
                )}, ${Math.round(shapeElem.color[2] * 255)})`;
                const fillColor = shapeElem.fill
                  ? `rgba(${Math.round(shapeElem.fill[0] * 255)}, ${Math.round(
                      shapeElem.fill[1] * 255
                    )}, ${Math.round(shapeElem.fill[2] * 255)}, 0.4)`
                  : "transparent";

                return (
                  <div
                    key={elem.id}
                    data-editor-item="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(elem.id);
                    }}
                    style={{
                      position: "absolute",
                      left: `${posX}px`,
                      top: `${posY}px`,
                      width: `${shapeElem.width * scaleRatio}px`,
                      height: `${shapeElem.height * scaleRatio}px`,
                      borderColor: strokeColor,
                      backgroundColor: fillColor,
                    }}
                    className={cn(
                      "border-2 rounded cursor-move transition-all",
                      isSelected ? "ring-2 ring-sky-500 shadow-lg" : "hover:ring-1 hover:ring-sky-400"
                    )}
                  />
                );
              }

              return null;
            })}
          </div>

          {/* Floating Bottom Page Bar (iLovePDF Style) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/90 text-white backdrop-blur-md shadow-2xl border border-white/10 z-30 text-xs">
            {/* Prev / Next Page Buttons */}
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
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
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

            {/* Fit Width / Reset Zoom */}
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
              title="Reset Zoom to 100%"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </main>

        {/* ── COLUMN 3: RIGHT SIDEBAR (Text Styles Toolbar) ── */}
        <aside className="w-80 border-l border-border/80 bg-card p-5 flex flex-col justify-between shadow-sm shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-3 flex items-center justify-between">
              <span>Text Styles</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {selectedElement ? "1 selected" : "Click text to style"}
              </span>
            </h3>

            {/* Direct Text Content Editor in Sidebar */}
            {selectedElement?.type === "text" && (
              <div className="space-y-1.5 p-3 rounded-xl bg-secondary/20 border border-border/60">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Text Content</span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Live sync</span>
                </label>
                <textarea
                  rows={3}
                  value={(selectedElement as EditableTextItem).text}
                  onChange={(e) =>
                    updateSelectedElement({ text: e.target.value })
                  }
                  placeholder="Edit block text..."
                  className="w-full rounded-lg border border-input bg-background/90 p-2 text-xs font-medium focus:border-primary focus:outline-none resize-y"
                />
              </div>
            )}

            {/* 1. Font Family & Font Size */}
            <div className="grid grid-cols-12 gap-2">
              {/* Font Family Dropdown */}
              <div className="col-span-7">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Font
                </label>
                <select
                  value={
                    selectedElement?.type === "text"
                      ? (selectedElement as EditableTextItem).fontFamily
                      : "helv"
                  }
                  onChange={(e) =>
                    updateSelectedElement({ fontFamily: e.target.value })
                  }
                  className="w-full h-9 rounded-xl border border-input bg-background/50 px-2.5 text-xs font-medium focus:border-primary focus:outline-none"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size Dropdown */}
              <div className="col-span-5">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Size
                </label>
                <select
                  value={
                    selectedElement?.type === "text"
                      ? (selectedElement as EditableTextItem).fontSize
                      : 14
                  }
                  onChange={(e) =>
                    updateSelectedElement({ fontSize: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-9 rounded-xl border border-input bg-background/50 px-2 text-xs font-mono font-medium focus:border-primary focus:outline-none"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} pt
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Style Buttons (Bold, Italic, Underline) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Formatting
              </label>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedElement?.type === "text") {
                      const t = selectedElement as EditableTextItem;
                      updateSelectedElement({ bold: !t.bold });
                    }
                  }}
                  className={cn(
                    "p-2 rounded-lg text-xs font-bold transition-colors flex-1 flex items-center justify-center",
                    selectedElement?.type === "text" && (selectedElement as EditableTextItem).bold
                      ? "bg-primary text-white shadow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedElement?.type === "text") {
                      const t = selectedElement as EditableTextItem;
                      updateSelectedElement({ italic: !t.italic });
                    }
                  }}
                  className={cn(
                    "p-2 rounded-lg text-xs font-bold transition-colors flex-1 flex items-center justify-center",
                    selectedElement?.type === "text" && (selectedElement as EditableTextItem).italic
                      ? "bg-primary text-white shadow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedElement?.type === "text") {
                      const t = selectedElement as EditableTextItem;
                      updateSelectedElement({ underline: !t.underline });
                    }
                  }}
                  className={cn(
                    "p-2 rounded-lg text-xs font-bold transition-colors flex-1 flex items-center justify-center",
                    selectedElement?.type === "text" && (selectedElement as EditableTextItem).underline
                      ? "bg-primary text-white shadow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Underline"
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Text Alignment */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Alignment
              </label>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/20 border border-border/60">
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ align: "left" })}
                  className={cn(
                    "p-2 rounded-lg text-xs transition-colors flex-1 flex items-center justify-center",
                    selectedElement?.type === "text" &&
                      (selectedElement as EditableTextItem).align === "left"
                      ? "bg-primary text-white shadow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Align Left"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ align: "center" })}
                  className={cn(
                    "p-2 rounded-lg text-xs transition-colors flex-1 flex items-center justify-center",
                    selectedElement?.type === "text" &&
                      (selectedElement as EditableTextItem).align === "center"
                      ? "bg-primary text-white shadow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Align Center"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ align: "right" })}
                  className={cn(
                    "p-2 rounded-lg text-xs transition-colors flex-1 flex items-center justify-center",
                    selectedElement?.type === "text" &&
                      (selectedElement as EditableTextItem).align === "right"
                      ? "bg-primary text-white shadow"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Align Right"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 4. Current Color & Custom Colors */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Current Color
              </label>
              {/* Active Color Preview */}
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full border-2 border-slate-900 shadow-sm"
                  style={{
                    backgroundColor: selectedElement
                      ? `rgb(${Math.round(selectedElement.color[0] * 255)}, ${Math.round(
                          selectedElement.color[1] * 255
                        )}, ${Math.round(selectedElement.color[2] * 255)})`
                      : "#0d0d0d",
                  }}
                />
                <span className="text-xs font-mono text-muted-foreground">
                  RGB:{" "}
                  {selectedElement
                    ? selectedElement.color.map((c) => Math.round(c * 255)).join(", ")
                    : "13, 13, 13"}
                </span>
              </div>

              {/* Custom Color Swatches Palette */}
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Custom Colors
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((cp) => (
                    <button
                      key={cp.label}
                      type="button"
                      onClick={() => updateSelectedElement({ color: cp.rgb })}
                      className="h-6 w-6 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: cp.hex }}
                      title={cp.label}
                    />
                  ))}
                  {/* Native Color Picker button */}
                  <label
                    className="h-6 w-6 rounded-full border border-dashed border-border/80 flex items-center justify-center cursor-pointer hover:border-primary text-muted-foreground hover:text-primary transition-colors text-xs font-bold"
                    title="Choose custom color"
                  >
                    <Plus className="h-3 w-3" />
                    <input
                      type="color"
                      className="hidden"
                      onChange={(e) => {
                        const hex = e.target.value;
                        const r = parseInt(hex.slice(1, 3), 16) / 255;
                        const g = parseInt(hex.slice(3, 5), 16) / 255;
                        const b = parseInt(hex.slice(5, 7), 16) / 255;
                        updateSelectedElement({ color: [r, g, b] });
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 5. Undo / Redo */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors flex-1 justify-center"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors flex-1 justify-center"
              >
                <Redo2 className="h-3.5 w-3.5" />
                <span>Redo</span>
              </button>
            </div>
          </div>

          {/* Error Message & Bottom Action Button */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            {serverError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {serverError}
              </p>
            )}

            <Button
              size="lg"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 shadow-lg hover:shadow-rose-600/20 text-sm rounded-xl transition-all"
              disabled={processing || upload.isUploading}
              onClick={handleProcess}
            >
              {processing || upload.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {upload.isUploading ? "Uploading file…" : "Saving changes…"}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Save changes <span className="text-base">➔</span>
                </span>
              )}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
