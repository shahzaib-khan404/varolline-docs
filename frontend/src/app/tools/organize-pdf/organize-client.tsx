"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowRight,
  ArrowDownUp,
  FilePlus,
  Rotate3D,
  Sparkles,
  Layers,
  FileText,
  Loader2,
  RefreshCw,
  ListOrdered,
  Hash,
} from "lucide-react";
import { CloudUploadButtons } from "@/components/features/upload/cloud-upload-buttons";
import type { FileRead } from "@/types/api";
import { useUpload } from "@/hooks/use-upload";

export interface PageItem {
  id: string;
  fileIndex: number;
  fileName: string;
  pageIndex: number; // 0-based index in source PDF
  displayPageNumber: number; // 1-based original page number
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  isBlank?: boolean;
}

async function getPdfJs(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("pdfjs-script") as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
      } else {
        existing.addEventListener("load", () => resolve((window as any).pdfjsLib));
        existing.addEventListener("error", reject);
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "pdfjs-script";
    script.src = "/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      }
      resolve(lib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function OrganizePdfClient() {
  const tool = TOOL_BY_ID["organize_pdf"];
  const upload = useUpload();

  const [pages, setPages] = useState<PageItem[]>([]);
  const [initialPages, setInitialPages] = useState<PageItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [showCustomOrder, setShowCustomOrder] = useState<boolean>(false);
  const [customOrderInput, setCustomOrderInput] = useState<string>("");

  // Track the signature of currently loaded files to avoid unnecessary reparsing
  const loadedFilesRef = useRef<string>("");

  const parseAndExtractPages = useCallback(async (files: File[]) => {
    if (!files.length) {
      setPages([]);
      setInitialPages([]);
      return;
    }

    setLoadingThumbnails(true);
    const newPages: PageItem[] = [];

    try {
      const pdfjsLib = await getPdfJs();
      if (!pdfjsLib) {
        setLoadingThumbnails(false);
        return;
      }

      for (let fIdx = 0; fIdx < files.length; fIdx++) {
        const file = files[fIdx]!;
        const arrayBuf = await file.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuf),
        });
        const pdf = await loadingTask.promise;

        for (let pNo = 1; pNo <= pdf.numPages; pNo++) {
          const page = await pdf.getPage(pNo);
          const viewport = page.getViewport({ scale: 0.35 });

          // Render thumbnail on an offscreen canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          let thumbUrl: string | undefined;
          if (ctx) {
            await page.render({
              canvasContext: ctx,
              viewport: viewport,
            }).promise;
            thumbUrl = canvas.toDataURL("image/jpeg", 0.85);
          }

          newPages.push({
            id: `f${fIdx}_p${pNo - 1}_${Date.now()}_${Math.random()}`,
            fileIndex: fIdx,
            fileName: file.name,
            pageIndex: pNo - 1,
            displayPageNumber: pNo,
            rotation: 0,
            thumbnailUrl: thumbUrl,
          });
        }
      }

      setPages(newPages);
      setInitialPages(newPages);
    } catch (err) {
      console.error("Failed to parse PDF pages for preview:", err);
    } finally {
      setLoadingThumbnails(false);
    }
  }, []);

  // Sync with uploaded files in ToolLayout
  const handleFilesUpdated = useCallback(
    (files: File[]) => {
      const signature = files.map((f) => `${f.name}_${f.size}_${f.lastModified}`).join("|");
      if (signature !== loadedFilesRef.current) {
        loadedFilesRef.current = signature;
        parseAndExtractPages(files);
      }
    },
    [parseAndExtractPages]
  );

  // Sync with uploaded files in ToolLayout safely in effect
  useEffect(() => {
    const rawFiles = upload.items
      .map((it) => it.file)
      .filter((f): f is File => f instanceof File);
    handleFilesUpdated(rawFiles);
  }, [upload.items, handleFilesUpdated]);

  // Card manipulations
  const handleRotatePage = (index: number, clockwise: boolean = true) => {
    setPages((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const delta = clockwise ? 90 : 270;
        return { ...item, rotation: (item.rotation + delta) % 360 };
      })
    );
  };

  const handleDeletePage = (index: number) => {
    setPages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMovePage = (index: number, direction: "left" | "right") => {
    setPages((prev) => {
      const targetIdx = direction === "left" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const clone = [...prev];
      const temp = clone[index]!;
      clone[index] = clone[targetIdx]!;
      clone[targetIdx] = temp;
      return clone;
    });
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    setPages((prev) => {
      const clone = [...prev];
      const [movedItem] = clone.splice(draggedIdx, 1);
      if (movedItem) {
        clone.splice(targetIndex, 0, movedItem);
      }
      return clone;
    });
    setDraggedIdx(null);
  };

  // Global toolbar operations
  const handleRotateAll = () => {
    setPages((prev) =>
      prev.map((item) => ({ ...item, rotation: (item.rotation + 90) % 360 }))
    );
  };

  const handleAddBlankPage = () => {
    const blankItem: PageItem = {
      id: `blank_${Date.now()}_${Math.random()}`,
      fileIndex: 0,
      fileName: "Blank",
      pageIndex: -1,
      displayPageNumber: 0,
      rotation: 0,
      isBlank: true,
    };
    setPages((prev) => [...prev, blankItem]);
  };

  const isSortedAscending =
    pages.length > 0 &&
    pages.every((p, i) => {
      if (i === 0) return true;
      const prev = pages[i - 1]!;
      if (p.isBlank || prev.isBlank) return true;
      if (prev.fileIndex !== p.fileIndex) return prev.fileIndex <= p.fileIndex;
      return prev.pageIndex <= p.pageIndex;
    });

  const handleOrderByNumber = (forceAscending?: boolean) => {
    // If not sorted ascending, sort ascending (1 -> N)
    // If already sorted ascending, toggle to descending (N -> 1)
    const targetAscending =
      forceAscending !== undefined ? forceAscending : !isSortedAscending;

    setPages((prev) =>
      [...prev].sort((a, b) => {
        if (a.isBlank && !b.isBlank) return 1;
        if (!a.isBlank && b.isBlank) return -1;
        if (a.fileIndex !== b.fileIndex) {
          return targetAscending ? a.fileIndex - b.fileIndex : b.fileIndex - a.fileIndex;
        }
        return targetAscending ? a.pageIndex - b.pageIndex : b.pageIndex - a.pageIndex;
      })
    );
  };

  const handleApplyCustomOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customOrderInput.trim()) return;

    const tokens = customOrderInput.split(/[,\s]+/).filter(Boolean);
    const targetNumbers: number[] = [];
    for (const t of tokens) {
      if (t.includes("-")) {
        const parts = t.split("-").map((n) => parseInt(n.trim(), 10));
        const start = parts[0];
        const end = parts[1];
        if (start !== undefined && end !== undefined && !isNaN(start) && !isNaN(end)) {
          const step = start <= end ? 1 : -1;
          for (let n = start; step > 0 ? n <= end : n >= end; n += step) {
            targetNumbers.push(n);
          }
        }
      } else {
        const n = parseInt(t, 10);
        if (!isNaN(n)) targetNumbers.push(n);
      }
    }

    if (!targetNumbers.length) return;

    const remaining = [...pages];
    const ordered: PageItem[] = [];

    for (const num of targetNumbers) {
      const matchIdx = remaining.findIndex((p) => !p.isBlank && p.displayPageNumber === num);
      if (matchIdx !== -1) {
        ordered.push(remaining.splice(matchIdx, 1)[0]!);
      }
    }

    setPages([...ordered, ...remaining]);
    setShowCustomOrder(false);
  };

  const handleSortDescending = () => {
    setPages((prev) => [...prev].reverse());
  };

  const handleReset = () => {
    setPages(initialPages);
  };

  // Job options payload for backend
  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      const primary = files[0]!;
      const additionalIds = files.slice(1).map((f) => f.id);

      if (!pages.length) {
        throw new Error("Cannot organize document with 0 pages. Please keep at least one page.");
      }

      const serializedPages = pages.map((p) => {
        if (p.isBlank) {
          return { type: "blank" };
        }
        return {
          file_idx: p.fileIndex,
          page_idx: p.pageIndex,
          rotation: p.rotation,
        };
      });

      return {
        input_file_id: primary.id,
        options: {
          pages: serializedPages,
          additional_file_ids: additionalIds,
        },
      };
    },
    [pages]
  );

  const rawFiles = upload.items
    .map((it) => it.file)
    .filter((f): f is File => f instanceof File);

  return (
    <ToolLayout
      tool={tool}
      multiFile={true}
      upload={upload}
      getJobOptions={getJobOptions}
      actionLabel="Organize PDF"
    >
      <div className="space-y-5">
            {/* Toolbar (iLovePDF Style) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/50">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleRotateAll}
                  disabled={!pages.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-all disabled:opacity-50"
                  title="Rotate all pages 90° clockwise"
                >
                  <RotateCw className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Rotate all</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOrderByNumber()}
                  disabled={!pages.length}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50",
                    isSortedAscending
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                      : "border-border/70 bg-secondary/30 hover:bg-secondary/60 text-foreground"
                  )}
                  title={isSortedAscending ? "Currently ascending (1→N). Click to invert (N→1)." : "Order pages sequentially by page number (1→N)."}
                >
                  <ListOrdered className="h-3.5 w-3.5 text-blue-500" />
                  <span>{isSortedAscending ? "Order: 1→N (Flip)" : "Order by number"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomOrder((prev) => !prev)}
                  disabled={!pages.length}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50",
                    showCustomOrder
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      : "border-border/70 bg-secondary/30 hover:bg-secondary/60 text-foreground"
                  )}
                  title="Specify custom page order sequence (e.g. 1, 3, 2, 4-6)"
                >
                  <Hash className="h-3.5 w-3.5 text-purple-500" />
                  <span className="hidden sm:inline">Custom order</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddBlankPage}
                  disabled={!pages.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-all disabled:opacity-50"
                  title="Insert a blank page at the end"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Blank page</span>
                </button>

                <button
                  type="button"
                  onClick={handleSortDescending}
                  disabled={!pages.length}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-all disabled:opacity-50"
                  title="Reverse page order"
                >
                  <ArrowDownUp className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Reverse</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!pages.length}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-all disabled:opacity-50"
                  title="Reset to original order"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CloudUploadButtons
                  onFilesSelected={upload.addFiles}
                  variant="toolbar"
                />
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                  {pages.length} {pages.length === 1 ? "page" : "pages"}
                </span>
              </div>
            </div>

            {/* Custom Sequence Input Bar */}
            {showCustomOrder && (
              <form
                onSubmit={handleApplyCustomOrder}
                className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/80 bg-muted/40 text-xs animate-in fade-in duration-150"
              >
                <span className="text-foreground font-semibold whitespace-nowrap">
                  Custom Page Sequence:
                </span>
                <input
                  type="text"
                  value={customOrderInput}
                  onChange={(e) => setCustomOrderInput(e.target.value)}
                  placeholder="e.g. 3, 1, 2 or 1-3, 5, 4"
                  className="flex-1 min-w-[180px] rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Apply Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomOrder(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Loading Indicator */}
            {loadingThumbnails && (
              <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground text-xs">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Generating interactive page thumbnails…</span>
              </div>
            )}

            {/* Visual Canvas Grid */}
            {!loadingThumbnails && pages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[520px] overflow-y-auto p-1 pr-2">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={cn(
                      "group relative flex flex-col rounded-xl border border-border/70 bg-card p-2.5 shadow-sm transition-all duration-150 select-none cursor-grab active:cursor-grabbing",
                      draggedIdx === idx ? "opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/20" : "hover:border-primary/50 hover:shadow-md"
                    )}
                  >
                    {/* Top Row: Page Badge & Delete Button */}
                    {/* Top Row: Page Badge & Delete Button */}
                    <div className="flex items-center justify-between pb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.isBlank ? (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            Blank
                          </span>
                        ) : (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            Page {p.displayPageNumber}
                          </span>
                        )}
                        <span
                          className="bg-muted text-muted-foreground text-[10px] font-mono px-1 py-0.5 rounded"
                          title={`Position #${idx + 1} in document`}
                        >
                          #{idx + 1}
                        </span>
                        {rawFiles.length > 1 && (
                          <span className="text-[9px] text-muted-foreground truncate max-w-[55px]">
                            Doc {p.fileIndex + 1}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePage(idx)}
                        className="text-muted-foreground hover:text-rose-500 p-1 rounded-md transition-colors"
                        title="Delete page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Thumbnail Display with Visual Rotation & Page Label Overlay */}
                    <div className="relative aspect-[1/1.3] w-full flex items-center justify-center rounded-lg bg-secondary/30 overflow-hidden border border-border/40 my-1">
                      {p.isBlank ? (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground">
                          <FileText className="h-8 w-8 stroke-1 text-muted-foreground/60 mb-1" />
                          <span className="text-[10px] font-medium">Blank Page</span>
                        </div>
                      ) : p.thumbnailUrl ? (
                        <>
                          <img
                            src={p.thumbnailUrl}
                            alt={`Page ${p.displayPageNumber}`}
                            className="max-h-full max-w-full object-contain transition-transform duration-200"
                            style={{ transform: `rotate(${p.rotation}deg)` }}
                          />
                          <div className="absolute bottom-1 left-1.5 bg-black/65 text-white text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-xs pointer-events-none">
                            Page {p.displayPageNumber}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground text-[10px]">
                          <FileText className="h-6 w-6 stroke-1 mb-1" />
                          <span>Page {p.displayPageNumber}</span>
                        </div>
                      )}

                      {/* Rotation indicator badge */}
                      {p.rotation > 0 && (
                        <span className="absolute bottom-1 right-1 bg-black/75 text-cyan-300 text-[9px] font-mono px-1 rounded">
                          {p.rotation}°
                        </span>
                      )}
                    </div>

                    {/* Bottom Quick Actions (Rotate & Shift) */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRotatePage(idx, false)}
                          className="p-1 hover:text-cyan-500 rounded transition-colors"
                          title="Rotate 90° counter-clockwise"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRotatePage(idx, true)}
                          className="p-1 hover:text-cyan-500 rounded transition-colors"
                          title="Rotate 90° clockwise"
                        >
                          <RotateCw className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePage(idx, "left")}
                          disabled={idx === 0}
                          className="p-1 hover:text-foreground disabled:opacity-30 rounded transition-colors"
                          title="Move left"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePage(idx, "right")}
                          disabled={idx === pages.length - 1}
                          className="p-1 hover:text-foreground disabled:opacity-30 rounded transition-colors"
                          title="Move right"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Instruction Footer */}
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Drag and drop any thumbnail to reorder. Use the rotate and delete icons on each card to customize your document layout.
            </p>
          </div>
    </ToolLayout>
  );
}
