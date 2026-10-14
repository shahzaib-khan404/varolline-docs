"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { useUpload } from "@/hooks/use-upload";
import { cn } from "@/lib/utils/cn";
import {
  ShieldAlert,
  EyeOff,
  Plus,
  X,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  Trash2,
  Lock,
  Sparkles,
  SlidersHorizontal,
  Mail,
  Phone,
  CreditCard,
  Fingerprint,
  Layers,
  Square,
  Check,
  Hand,
  Eraser,
  User,
  Building,
  Calendar,
  MapPin,
  Receipt,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import type { FileRead } from "@/types/api";

// PDF.js loader from public assets
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

export interface PlacedRedaction {
  id: string;
  page: number; // 1-based page
  xPct: number; // percentage of page width (0-100)
  yPct: number; // percentage of page height (0-100)
  widthPct: number;
  heightPct: number;
  text?: string;
  fillColor: string;
  textColor: string;
}

const SUGGESTED_TERMS = [
  "Confidential",
  "Internal Only",
  "Salary",
  "Password",
  "Bank Account",
  "SSN",
  "Private",
];

const FILL_COLORS = [
  { label: "Black", hex: "#000000", textColor: "#ffffff" },
  { label: "White", hex: "#ffffff", textColor: "#000000" },
  { label: "Slate", hex: "#1e293b", textColor: "#ffffff" },
  { label: "Crimson", hex: "#991b1b", textColor: "#ffffff" },
];

const TEXT_COLORS = [
  { label: "White", hex: "#ffffff" },
  { label: "Amber", hex: "#fbbf24" },
  { label: "Light Gray", hex: "#cbd5e1" },
  { label: "Red", hex: "#f87171" },
];

// iLovePDF 8 Smart Redact Categories
const SMART_REDACT_CATEGORIES = [
  { id: "person_names", label: "Person names", icon: User, desc: "Titles & full names" },
  { id: "company_names", label: "Company names", icon: Building, desc: "Inc, LLC, Corp, Ltd" },
  { id: "ssn_and_id_numbers", label: "SSNs & ID numbers", icon: Fingerprint, desc: "Social security & tax IDs" },
  { id: "dates_of_birth", label: "Dates of birth", icon: Calendar, desc: "Birthdays & dates" },
  { id: "addresses", label: "Addresses", icon: MapPin, desc: "Street addresses & postal codes" },
  { id: "phones_and_emails", label: "Phones & emails", icon: Mail, desc: "Phone numbers & email addresses" },
  { id: "account_and_policy_numbers", label: "Account & policy numbers", icon: Receipt, desc: "Bank accounts & IBANs" },
  { id: "medical_record_numbers", label: "Medical record numbers", icon: Stethoscope, desc: "MRN & patient IDs" },
];

export function RedactPdfClient() {
  const tool = TOOL_BY_ID["redact_pdf"];
  const upload = useUpload();

  // Active Toolbar Tool Mode: Pan, Redact Area, Redact Page, Eraser
  const [toolbarTool, setToolbarTool] = useState<"pan" | "redact" | "page" | "eraser">("redact");

  // Mode: Area Selection (Draw), Keyword Search, Smart PII Detection
  const [redactionMode, setRedactionMode] = useState<"area" | "search" | "pii">("area");

  // Format & Appearance
  const [fillColor, setFillColor] = useState<string>("#000000");
  const [useOverlayText, setUseOverlayText] = useState<boolean>(true);
  const [overlayText, setOverlayText] = useState<string>("[REDACTED]");
  const [textColor, setTextColor] = useState<string>("#ffffff");

  // Keyword Search
  const [searchTerms, setSearchTerms] = useState<string[]>(["Confidential"]);
  const [currentInput, setCurrentInput] = useState<string>("");

  // Smart Redact Dialog Modal State (iLovePDF Style)
  const [smartModalOpen, setSmartModalOpen] = useState<boolean>(false);
  const [smartCategories, setSmartCategories] = useState<{ [key: string]: boolean }>({
    person_names: true,
    company_names: true,
    ssn_and_id_numbers: true,
    dates_of_birth: true,
    addresses: true,
    phones_and_emails: true,
    account_and_policy_numbers: true,
    medical_record_numbers: true,
  });
  const [smartPrompt, setSmartPrompt] = useState<string>("");

  // Placed manual redaction rectangles
  const [placedRedactions, setPlacedRedactions] = useState<PlacedRedaction[]>([]);
  const [fullPagesRedacted, setFullPagesRedacted] = useState<number[]>([]);

  // Security options
  const [scrubMetadata, setScrubMetadata] = useState<boolean>(true);
  const [passwordProtection, setPasswordProtection] = useState<string>("");

  // PDF Preview State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);
  const pdfDocRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Active Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; origXPct: number; origYPct: number }>({
    x: 0,
    y: 0,
    origXPct: 0,
    origYPct: 0,
  });

  // Render current PDF page preview via pdfjsLib
  const renderPdfPage = useCallback(async (doc: any, pageNo: number) => {
    try {
      setLoadingDoc(true);
      const page = await doc.getPage(pageNo);
      const viewport = page.getViewport({ scale: 1.2 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        setPagePreviewUrl(canvas.toDataURL("image/jpeg", 0.9));
      }
    } catch (err) {
      console.error("PDF page render error:", err);
    } finally {
      setLoadingDoc(false);
    }
  }, []);

  // Load PDF when file is selected
  useEffect(() => {
    const rawFiles = upload.items
      .map((it) => it.file)
      .filter((f): f is File => f instanceof File);

    if (!rawFiles.length) {
      setPagePreviewUrl(null);
      pdfDocRef.current = null;
      setPlacedRedactions([]);
      setFullPagesRedacted([]);
      return;
    }

    const loadPdf = async () => {
      try {
        setLoadingDoc(true);
        const pdfjs = await getPdfJs();
        if (!pdfjs) return;

        const arrayBuf = await rawFiles[0]!.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuf) });
        const doc = await loadingTask.promise;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);

        await renderPdfPage(doc, 1);
      } catch (err) {
        console.error("Failed to load PDF preview:", err);
      } finally {
        setLoadingDoc(false);
      }
    };

    loadPdf();
  }, [upload.items, renderPdfPage]);

  // Page Switcher
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !pdfDocRef.current) return;
    setCurrentPage(newPage);
    renderPdfPage(pdfDocRef.current, newPage);
  };

  // Add search term
  const addTerm = (term: string) => {
    const trimmed = term.trim();
    if (trimmed && !searchTerms.includes(trimmed)) {
      setSearchTerms((prev) => [...prev, trimmed]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTerm(currentInput);
      setCurrentInput("");
    }
  };

  const removeTerm = (t: string) => {
    setSearchTerms((prev) => prev.filter((item) => item !== t));
  };

  // Toggle Category in Smart Redact
  const toggleSmartCategory = (catId: string) => {
    setSmartCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleSelectAllCategories = () => {
    const updated: { [k: string]: boolean } = {};
    SMART_REDACT_CATEGORIES.forEach((c) => {
      updated[c.id] = true;
    });
    setSmartCategories(updated);
  };

  const handleClearAllCategories = () => {
    const updated: { [k: string]: boolean } = {};
    SMART_REDACT_CATEGORIES.forEach((c) => {
      updated[c.id] = false;
    });
    setSmartCategories(updated);
  };

  // Quick pattern buttons
  const addPatternSearch = (patternName: string) => {
    if (patternName === "Credit Card") {
      setSmartCategories((prev) => ({ ...prev, account_and_policy_numbers: true }));
      setRedactionMode("pii");
    } else if (patternName === "Phone Number") {
      setSmartCategories((prev) => ({ ...prev, phones_and_emails: true }));
      setRedactionMode("pii");
    } else if (patternName === "Email") {
      setSmartCategories((prev) => ({ ...prev, phones_and_emails: true }));
      setRedactionMode("pii");
    }
  };

  // Manual Add Redaction Box
  const handleAddBoxManually = () => {
    const newBox: PlacedRedaction = {
      id: `redact_${Date.now()}_${Math.random()}`,
      page: currentPage,
      xPct: 25 + Math.random() * 10,
      yPct: 30 + Math.random() * 15,
      widthPct: 40,
      heightPct: 8,
      text: useOverlayText ? overlayText : "",
      fillColor,
      textColor,
    };
    setPlacedRedactions((prev) => [...prev, newBox]);
  };

  // Toggle Full Page Redaction
  const toggleFullPageRedaction = (pno: number) => {
    setFullPagesRedacted((prev) =>
      prev.includes(pno) ? prev.filter((p) => p !== pno) : [...prev, pno]
    );
  };

  // Remove single redaction
  const removeRedaction = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlacedRedactions((prev) => prev.filter((r) => r.id !== id));
  };

  // Clear all redactions across entire document
  const handleClearAllMarks = () => {
    setPlacedRedactions([]);
    setFullPagesRedacted([]);
    setSearchTerms([]);
    handleClearAllCategories();
    setSmartPrompt("");
  };

  // Mouse Handlers for Drawing Redaction Rectangle
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolbarTool === "pan") return;

    if (toolbarTool === "page") {
      toggleFullPageRedaction(currentPage);
      return;
    }

    if (draggingId || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. If currently dragging an existing redaction
    if (draggingId && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      setPlacedRedactions((prev) =>
        prev.map((r) => {
          if (r.id !== draggingId) return r;
          const newX = Math.max(0, Math.min(100 - r.widthPct, dragStartRef.current.origXPct + deltaXPct));
          const newY = Math.max(0, Math.min(100 - r.heightPct, dragStartRef.current.origYPct + deltaYPct));
          return { ...r, xPct: newX, yPct: newY };
        })
      );
      return;
    }

    // 2. If drawing a new redaction box
    if (isDrawing && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setDrawCurrent({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (draggingId) {
      setDraggingId(null);
      return;
    }

    if (isDrawing && drawStart && drawCurrent && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const left = Math.min(drawStart.x, drawCurrent.x);
      const top = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);

      // Only create if minimum drag threshold is met (e.g. > 15px)
      if (width > 15 && height > 10) {
        const xPct = (left / rect.width) * 100;
        const yPct = (top / rect.height) * 100;
        const widthPct = (width / rect.width) * 100;
        const heightPct = (height / rect.height) * 100;

        const newRedaction: PlacedRedaction = {
          id: `redact_${Date.now()}_${Math.random()}`,
          page: currentPage,
          xPct,
          yPct,
          widthPct,
          heightPct,
          text: useOverlayText ? overlayText : "",
          fillColor,
          textColor,
        };

        setPlacedRedactions((prev) => [...prev, newRedaction]);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handleRedactionMouseDown = (e: React.MouseEvent, r: PlacedRedaction) => {
    e.stopPropagation();
    e.preventDefault();

    if (toolbarTool === "eraser") {
      removeRedaction(r.id);
      return;
    }

    setDraggingId(r.id);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origXPct: r.xPct,
      origYPct: r.yPct,
    };
  };

  // Prepare backend payload
  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      const pageW = 595.0; // Standard A4 width in pt (72 dpi)
      const pageH = 842.0; // Standard A4 height in pt

      const normalizedRects = placedRedactions.map((r) => ({
        page: r.page,
        x: (r.xPct / 100) * pageW,
        y: (r.yPct / 100) * pageH,
        width: (r.widthPct / 100) * pageW,
        height: (r.heightPct / 100) * pageH,
        text: r.text || (useOverlayText ? overlayText : ""),
        fill_color: r.fillColor,
        text_color: r.textColor,
      }));

      const activeCategories = Object.entries(smartCategories)
        .filter(([_, active]) => active)
        .map(([key]) => key);

      return {
        input_file_id: files[0]!.id,
        options: {
          search_terms: searchTerms,
          rectangles: normalizedRects,
          patterns: activeCategories,
          full_pages: fullPagesRedacted,
          fill_color: fillColor,
          overlay_text: useOverlayText ? overlayText : null,
          text_color: textColor,
          scrub_metadata: scrubMetadata,
          password: passwordProtection.trim() ? passwordProtection.trim() : null,
          smart_prompt: smartPrompt.trim() ? smartPrompt.trim() : null,
        },
      };
    },
    [
      placedRedactions,
      smartCategories,
      searchTerms,
      fullPagesRedacted,
      fillColor,
      useOverlayText,
      overlayText,
      textColor,
      scrubMetadata,
      passwordProtection,
      smartPrompt,
    ]
  );

  const currentPageRedactions = placedRedactions.filter((r) => r.page === currentPage);
  const isCurrentPageFullRedacted = fullPagesRedacted.includes(currentPage);
  const activeCategoriesCount = Object.values(smartCategories).filter(Boolean).length;
  const totalMarkedCount =
    placedRedactions.length +
    fullPagesRedacted.length +
    searchTerms.length +
    activeCategoriesCount +
    (smartPrompt.trim() ? 1 : 0);

  return (
    <ToolLayout
      tool={tool}
      upload={upload}
      getJobOptions={getJobOptions}
      actionLabel={
        <span className="flex items-center justify-center gap-2 text-base font-bold text-white tracking-wide">
          <span>Redact PDF</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
            <ArrowRight className="h-4 w-4 text-white" />
          </span>
        </span>
      }
      actionClassName="bg-[#e04545] hover:bg-[#cf3838] text-white py-6 rounded-2xl shadow-lg border-0 transition-all hover:scale-[1.01]"
    >
      <div className="space-y-6">
        {/* Banner: True Cryptographic Redaction */}
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <span>True Cryptographic Redaction (Irreversible Sanitization)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Unlike basic tools that merely draw black boxes over text, uLovepdf completely purges font glyphs, character coordinates, and underlying raster pixels from the document stream. Redacted data cannot be copied, selected, or forensically recovered.
          </p>
        </div>

        {/* 3-Mode Redaction Selector */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRedactionMode("area")}
            className={cn(
              "py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              redactionMode === "area"
                ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Square className="h-3.5 w-3.5" />
            <span>Area Selection</span>
          </button>

          <button
            type="button"
            onClick={() => setRedactionMode("search")}
            className={cn(
              "py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              redactionMode === "search"
                ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Keyword Search</span>
          </button>

          <button
            type="button"
            onClick={() => setRedactionMode("pii")}
            className={cn(
              "py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              redactionMode === "pii"
                ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Smart Redact</span>
          </button>
        </div>

        {/* 2-Column Workflow: Sidebar Configuration & Document Canvas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Redaction Controls */}
          <div className="md:col-span-5 space-y-4">
            {/* Mode 1: Area Selection Controls */}
            {redactionMode === "area" && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Square className="h-3.5 w-3.5 text-rose-500" />
                    <span>Area Selection Mode</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {currentPageRedactions.length} on page
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Click and drag directly on the document preview to draw a blackout box over any text, logo, photo, or section.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddBoxManually}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Box</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFullPageRedaction(currentPage)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer border",
                      isCurrentPageFullRedacted
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        : "bg-secondary/50 hover:bg-secondary text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{isCurrentPageFullRedacted ? "Page Redacted" : "Redact Page"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Keyword Search Controls */}
            {redactionMode === "search" && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-rose-500" />
                    <span>Keyword & Phrase Scrub</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {searchTerms.length} active
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type keyword and press Enter..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-rose-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addTerm(currentInput);
                        setCurrentInput("");
                      }}
                      className="px-3 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Suggestions */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground self-center mr-1">Quick:</span>
                    {SUGGESTED_TERMS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTerm(s)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>

                  {/* Quick Patterns Bar matching iLovePDF */}
                  <div className="pt-2 border-t border-border/60 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Quick Pattern Detection:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => addPatternSearch("Credit Card")}
                        className="flex items-center justify-center gap-1 p-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[10px] font-medium transition-colors"
                      >
                        <CreditCard className="h-3 w-3 text-rose-500" />
                        <span>Credit Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addPatternSearch("Phone Number")}
                        className="flex items-center justify-center gap-1 p-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[10px] font-medium transition-colors"
                      >
                        <Phone className="h-3 w-3 text-rose-500" />
                        <span>Phone</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addPatternSearch("Email")}
                        className="flex items-center justify-center gap-1 p-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[10px] font-medium transition-colors"
                      >
                        <Mail className="h-3 w-3 text-rose-500" />
                        <span>Email</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Terms Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Target Keywords to Scrub:
                  </span>
                  <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 rounded-xl border border-border/60 bg-muted/20">
                    {searchTerms.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        No terms added yet. Add at least one phrase above.
                      </span>
                    ) : (
                      searchTerms.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-medium"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => removeTerm(t)}
                            className="hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: Smart Redact (Official iLovePDF Feature) */}
            {redactionMode === "pii" && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Smart Redact (iLovePDF)</span>
                  </span>
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    AI Detection
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Choose the sensitive information categories you want to detect across the PDF.
                </p>

                {/* Open Smart Redact Modal Button */}
                <button
                  type="button"
                  onClick={() => setSmartModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/30 text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Configure Smart Redact Categories ({activeCategoriesCount}/8)</span>
                </button>

                {/* Category overview chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-muted-foreground">Active Detection Categories:</span>
                    <button
                      type="button"
                      onClick={() => setSmartModalOpen(true)}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SMART_REDACT_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const active = smartCategories[cat.id];
                      return (
                        <div
                          key={cat.id}
                          onClick={() => toggleSmartCategory(cat.id)}
                          className={cn(
                            "flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                            active
                              ? "bg-rose-500/10 border-rose-500/40 text-foreground"
                              : "bg-muted/30 border-border/60 text-muted-foreground opacity-60"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", active ? "text-rose-500" : "text-muted-foreground")} />
                          <span className="text-[11px] font-medium truncate">{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {smartPrompt && (
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-[11px]">
                    <span className="font-bold text-foreground">Custom Prompt: </span>
                    <span className="text-muted-foreground italic">"{smartPrompt}"</span>
                  </div>
                )}
              </div>
            )}

            {/* "Marked for Redaction" Summary Panel (Official iLovePDF Feature) */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>Marked for Redaction ({totalMarkedCount})</span>
                </span>
                {totalMarkedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllMarks}
                    className="text-[10px] font-semibold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {totalMarkedCount === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-2">
                  Select and search text, draw areas, or run Smart Redact to mark sensitive content.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Full Page Marks */}
                  {fullPagesRedacted.map((p) => (
                    <div
                      key={`full_page_${p}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 text-xs border border-rose-500/30"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        <Layers className="h-3 w-3" /> Entire Page {p}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleFullPageRedaction(p)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Manual Area Box Marks */}
                  {placedRedactions.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs border border-border/50"
                    >
                      <span className="text-[11px] text-foreground font-mono truncate">
                        Page {r.page}: Box #{idx + 1} ({Math.round(r.widthPct)}% × {Math.round(r.heightPct)}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRedaction(r.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Keyword Search Terms */}
                  {searchTerms.map((t) => (
                    <div
                      key={`term_${t}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs border border-border/50"
                    >
                      <span className="text-[11px] text-foreground flex items-center gap-1.5 truncate">
                        <Search className="h-3 w-3 text-muted-foreground" /> Keyword: "{t}"
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTerm(t)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Active Smart Categories */}
                  {SMART_REDACT_CATEGORIES.filter((c) => smartCategories[c.id]).map((c) => (
                    <div
                      key={`smart_${c.id}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 text-xs border border-amber-500/20"
                    >
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 truncate">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Pattern: {c.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSmartCategory(c.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Redaction Formatting & Style Configuration */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-rose-500" />
                <span>Redaction Style & Formatting</span>
              </span>

              {/* Fill Color */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Fill Color:</span>
                <div className="grid grid-cols-4 gap-2">
                  {FILL_COLORS.map((fc) => (
                    <button
                      key={fc.hex}
                      type="button"
                      onClick={() => setFillColor(fc.hex)}
                      className={cn(
                        "flex items-center justify-center py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                        fillColor === fc.hex
                          ? "border-rose-500 ring-2 ring-rose-500/30 font-bold"
                          : "border-border/70 hover:border-border"
                      )}
                      style={{ backgroundColor: fc.hex, color: fc.textColor }}
                    >
                      {fc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Text */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOverlayText}
                    onChange={(e) => setUseOverlayText(e.target.checked)}
                    className="rounded border-border text-rose-600 focus:ring-rose-500"
                  />
                  <span>Display Overlay Text on Redacted Areas</span>
                </label>

                {useOverlayText && (
                  <div className="space-y-2 pl-5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="e.g. [REDACTED] or CONFIDENTIAL"
                      className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-rose-500 focus:outline-none"
                    />

                    {/* Text Color Selection */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-muted-foreground">Text Color:</span>
                      {TEXT_COLORS.map((tc) => (
                        <button
                          key={tc.hex}
                          type="button"
                          onClick={() => setTextColor(tc.hex)}
                          className={cn(
                            "h-5 w-5 rounded-full border transition-transform cursor-pointer",
                            textColor === tc.hex ? "scale-125 border-rose-500 ring-1 ring-rose-500" : "border-transparent"
                          )}
                          style={{ backgroundColor: tc.hex }}
                          title={tc.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Document Sanitization & Password Lock */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scrubMetadata}
                    onChange={(e) => setScrubMetadata(e.target.checked)}
                    className="rounded border-border text-rose-600 focus:ring-rose-500"
                  />
                  <span>Purge Metadata, Revision History & Hidden Comments</span>
                </label>

                <div className="pt-1.5 space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span>Password Protect (Optional):</span>
                  </label>
                  <input
                    type="password"
                    value={passwordProtection}
                    onChange={(e) => setPasswordProtection(e.target.value)}
                    placeholder="Enter password to encrypt sanitized PDF..."
                    className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* iLovePDF Alert Notice */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Remember to review the result of your document before sending private information. Redaction is permanent.
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Document Canvas & Top Floating Toolbar */}
          <div className="md:col-span-7 space-y-3">
            {/* Top Toolbar (editpdf-menu-toolbar matching iLovePDF) */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-card border border-border/80 shadow-xs">
              {/* Tool Selection Group: Pan, Redact Area, Redact Page, Eraser */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setToolbarTool("pan")}
                  className={cn(
                    "p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    toolbarTool === "pan"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Pan Tool"
                >
                  <Hand className="h-4 w-4" />
                  <span className="hidden sm:inline">Pan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setToolbarTool("redact")}
                  className={cn(
                    "p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    toolbarTool === "redact"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Draw Redaction Area"
                >
                  <Square className="h-4 w-4" />
                  <span className="hidden sm:inline">Redact</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setToolbarTool("page");
                    toggleFullPageRedaction(currentPage);
                  }}
                  className={cn(
                    "p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    toolbarTool === "page" || isCurrentPageFullRedacted
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Redact Entire Page"
                >
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Redact Page</span>
                </button>

                <button
                  type="button"
                  onClick={() => setToolbarTool("eraser")}
                  className={cn(
                    "p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    toolbarTool === "eraser"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Eraser (Click redaction to remove)"
                >
                  <Eraser className="h-4 w-4" />
                  <span className="hidden sm:inline">Eraser</span>
                </button>
              </div>

              {/* Page Switcher */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Document Canvas Surface */}
            <div
              ref={canvasContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={cn(
                "relative w-full aspect-[1/1.414] rounded-xl border-2 border-border/80 bg-muted/20 overflow-hidden shadow-inner flex items-center justify-center select-none",
                toolbarTool === "pan"
                  ? "cursor-grab active:cursor-grabbing"
                  : toolbarTool === "eraser"
                  ? "cursor-not-allowed"
                  : "cursor-crosshair"
              )}
            >
              {loadingDoc && (
                <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Loading PDF page…</span>
                </div>
              )}

              {!loadingDoc && pagePreviewUrl && (
                <img
                  src={pagePreviewUrl}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

              {!loadingDoc && !pagePreviewUrl && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mb-2 stroke-1" />
                  <p className="text-xs font-medium">Select a PDF file above to preview and redact</p>
                </div>
              )}

              {/* Full Page Redacted Overlay Indicator */}
              {isCurrentPageFullRedacted && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white z-20 backdrop-blur-xs">
                  <EyeOff className="h-10 w-10 text-rose-500 mb-2" />
                  <p className="text-sm font-bold tracking-wider">[ENTIRE PAGE REDACTED]</p>
                  <button
                    type="button"
                    onClick={() => toggleFullPageRedaction(currentPage)}
                    className="mt-3 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Undo Full Page Redaction
                  </button>
                </div>
              )}

              {/* Live Drawing Preview Box */}
              {isDrawing && drawStart && drawCurrent && (
                <div
                  style={{
                    left: `${Math.min(drawStart.x, drawCurrent.x)}px`,
                    top: `${Math.min(drawStart.y, drawCurrent.y)}px`,
                    width: `${Math.abs(drawCurrent.x - drawStart.x)}px`,
                    height: `${Math.abs(drawCurrent.y - drawStart.y)}px`,
                    backgroundColor: fillColor,
                    color: textColor,
                  }}
                  className="absolute border-2 border-dashed border-rose-500 opacity-80 pointer-events-none flex items-center justify-center text-[10px] font-bold truncate z-30"
                >
                  {useOverlayText ? overlayText : ""}
                </div>
              )}

              {/* Render Placed Redactions on this Page */}
              {!loadingDoc &&
                currentPageRedactions.map((redaction) => (
                  <div
                    key={redaction.id}
                    onMouseDown={(e) => handleRedactionMouseDown(e, redaction)}
                    style={{
                      left: `${redaction.xPct}%`,
                      top: `${redaction.yPct}%`,
                      width: `${redaction.widthPct}%`,
                      height: `${redaction.heightPct}%`,
                      backgroundColor: redaction.fillColor,
                      color: redaction.textColor,
                    }}
                    className={cn(
                      "absolute group flex items-center justify-center p-1 cursor-move transition-shadow z-10 border border-transparent hover:border-rose-500 hover:ring-2 hover:ring-rose-500/30",
                      draggingId === redaction.id ? "ring-2 ring-rose-500 shadow-xl cursor-grabbing" : "shadow-xs",
                      toolbarTool === "eraser" && "hover:opacity-50 hover:border-red-600 cursor-pointer"
                    )}
                  >
                    {/* Delete Cross */}
                    <button
                      type="button"
                      onClick={(e) => removeRedaction(redaction.id, e)}
                      className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                      title="Remove redaction"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>

                    {/* Redaction Overlay Text */}
                    <span className="text-[10px] font-bold tracking-tight truncate pointer-events-none select-none">
                      {redaction.text || (useOverlayText ? overlayText : "")}
                    </span>
                  </div>
                ))}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Click & drag on the document surface to draw redactions. Click any redaction to drag and reposition.
            </p>
          </div>
        </div>
      </div>

      {/* Official iLovePDF Smart Redact Dialog Modal */}
      {smartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Smart Redact</h3>
                  <p className="text-[11px] text-muted-foreground">Automated Sensitive Information Detection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmartModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose the sensitive information you want to detect across your document. You can review every suggested redaction before applying it.
            </p>

            {/* Category Fieldset */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Detect redactions for:</span>
                <div className="flex items-center gap-2 text-[11px] text-primary">
                  <button
                    type="button"
                    onClick={handleClearAllCategories}
                    className="hover:underline text-muted-foreground"
                  >
                    Clear all
                  </button>
                  <span className="text-muted-foreground/40">|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="hover:underline text-rose-500 font-semibold"
                  >
                    Select all
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {SMART_REDACT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isChecked = smartCategories[cat.id];
                  return (
                    <label
                      key={cat.id}
                      onClick={() => toggleSmartCategory(cat.id)}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                        isChecked
                          ? "border-rose-500/40 bg-rose-500/5 shadow-xs"
                          : "border-border/60 hover:bg-muted/40"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded mt-0.5 flex items-center justify-center border shrink-0 transition-colors",
                          isChecked ? "bg-rose-600 border-rose-600 text-white" : "border-border"
                        )}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Icon className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="truncate">{cat.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{cat.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* "Anything else?" custom prompt textarea */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-foreground">Anything else?</label>
              <textarea
                value={smartPrompt}
                onChange={(e) => setSmartPrompt(e.target.value)}
                rows={2}
                placeholder="e.g. redact all vehicle plate numbers, salary figures, passport numbers..."
                className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setSmartModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSmartModalOpen(false);
                  setRedactionMode("pii");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Apply Smart Redact</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
