"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { useUpload } from "@/hooks/use-upload";
import { cn } from "@/lib/utils/cn";
import {
  GripVertical,
  Pencil,
  RotateCcw,
  User,
  Calendar,
  Type,
  Stamp,
  ArrowRight,
  X,
  Upload,
  FolderUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Loader2,
  Lock,
  Mail,
  Building,
  MapPin,
  CheckCircle2,
  Shield,
  FileCheck,
  Sparkles,
  SlidersHorizontal,
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

export type SignatureType = "simple" | "digital";
export type FieldType = "signature" | "initials" | "name" | "date" | "text" | "stamp" | "digital_seal";

export interface PlacedField {
  id: string;
  type: FieldType;
  page: number; // 1-based page
  xPct: number; // percentage of page width (0-100)
  yPct: number; // percentage of page height (0-100)
  widthPct: number;
  heightPct: number;
  value: string;
}

const CALLIGRAPHY_FONTS = [
  { id: "dancing", name: "Dancing Script", font: "'Dancing Script', cursive" },
  { id: "greatvibes", name: "Great Vibes", font: "'Great Vibes', cursive" },
  { id: "brush", name: "Brush Script", font: "'Brush Script MT', cursive" },
  { id: "serif", name: "Classic Script", font: "'Times New Roman', serif, italic" },
];

const SIGNING_REASONS = [
  "I approve and certify this document",
  "I am the author of this document",
  "I have reviewed and agree to the terms",
  "Certified true and legal copy",
  "Official notary / witness verification",
];

// Helper to remove white paper background from an uploaded signature image
function cleanSignatureBackground(dataUrl: string, callback: (result: string) => void) {
  if (typeof window === "undefined") {
    callback(dataUrl);
    return;
  }
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      callback(dataUrl);
      return;
    }
    ctx.drawImage(img, 0, 0);
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness > 215) {
          data[i + 3] = 0; // Transparent
        } else if (brightness > 180) {
          const factor = (215 - brightness) / 35;
          data[i + 3] = Math.round(data[i + 3]! * factor);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      callback(canvas.toDataURL("image/png"));
    } catch {
      callback(dataUrl);
    }
  };
  img.onerror = () => callback(dataUrl);
  img.src = dataUrl;
}

export function SignPdfClient() {
  const tool = TOOL_BY_ID["sign_pdf"];
  const upload = useUpload();

  // Mode: Simple Signature vs Digital Signature
  const [signatureType, setSignatureType] = useState<SignatureType>("simple");

  // Signer Identity Data (Empty by default for user to fill)
  const [signerName, setSignerName] = useState("");
  const [signerInitials, setSignerInitials] = useState("");
  const [fontFamily, setFontFamily] = useState(CALLIGRAPHY_FONTS[0]!.font);
  const [penColor, setPenColor] = useState("#0f172a"); // Black, blue, red

  // Digital Signature Specifications (Empty by default for user to fill)
  const [signerEmail, setSignerEmail] = useState("");
  const [signerOrg, setSignerOrg] = useState("");
  const [signingReason, setSigningReason] = useState(SIGNING_REASONS[0]!);
  const [signingLocation, setSigningLocation] = useState("");
  const [complianceLevel, setComplianceLevel] = useState<"aes" | "qes">("qes");
  const [lockDocument, setLockDocument] = useState(true);
  const [embedTimestamp, setEmbedTimestamp] = useState(true);
  const [attachAuditPage, setAttachAuditPage] = useState(true);

  // Auto-sync initials when name is typed
  const handleSignerNameChange = (val: string) => {
    setSignerName(val);
    const parts = val.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      setSignerInitials(parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 3));
    } else {
      setSignerInitials("");
    }
  };

  // Signature Data
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isUploadedImage, setIsUploadedImage] = useState(false);
  const [initialsDataUrl, setInitialsDataUrl] = useState<string | null>(null);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);

  // Placed Fields on Document
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // PDF Preview State
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const pdfDocRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Hidden File Inputs for Direct Computer Upload
  const signatureFileInputRef = useRef<HTMLInputElement | null>(null);
  const stampFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"type" | "draw" | "upload">("type");
  const [targetEditType, setTargetEditType] = useState<"signature" | "initials">("signature");
  const [modalUploadedImage, setModalUploadedImage] = useState<string | null>(null);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);

  // Draw Mode Canvas
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Active dragging field
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; fieldXPct: number; fieldYPct: number }>({
    x: 0,
    y: 0,
    fieldXPct: 0,
    fieldYPct: 0,
  });

  // Generate calligraphic signature image
  const generateCalligraphyImage = useCallback((text: string, font: string, color: string): string => {
    if (typeof document === "undefined" || !text.trim()) return "";
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 600 48px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 200, 60);
    return canvas.toDataURL("image/png");
  }, []);

  // Update signature previews when name, font, or color changes (only if not a custom uploaded image)
  useEffect(() => {
    if (!isUploadedImage) {
      if (signerName.trim()) {
        const sig = generateCalligraphyImage(signerName, fontFamily, penColor);
        setSignatureDataUrl(sig);
        setPlacedFields((prev) =>
          prev.map((f) => (f.type === "signature" ? { ...f, value: sig } : f))
        );
      } else {
        setSignatureDataUrl(null);
        setPlacedFields((prev) =>
          prev.map((f) => (f.type === "signature" ? { ...f, value: "" } : f))
        );
      }
    }
  }, [signerName, fontFamily, penColor, isUploadedImage, generateCalligraphyImage]);

  useEffect(() => {
    if (signerInitials.trim()) {
      const init = generateCalligraphyImage(signerInitials, fontFamily, penColor);
      setInitialsDataUrl(init);
      setPlacedFields((prev) =>
        prev.map((f) => (f.type === "initials" ? { ...f, value: init } : f))
      );
    } else {
      setInitialsDataUrl(null);
      setPlacedFields((prev) =>
        prev.map((f) => (f.type === "initials" ? { ...f, value: "" } : f))
      );
    }
  }, [signerInitials, fontFamily, penColor, generateCalligraphyImage]);

  // Handle direct file upload from computer
  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawData = evt.target?.result as string;
      cleanSignatureBackground(rawData, (cleanedData) => {
        setSignatureDataUrl(cleanedData);
        setIsUploadedImage(true);
        // update placed signature fields
        setPlacedFields((prev) =>
          prev.map((f) => (f.type === "signature" ? { ...f, value: cleanedData } : f))
        );
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected if desired
    e.target.value = "";
  };

  const handleStampFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawData = evt.target?.result as string;
      setStampDataUrl(rawData);
      setPlacedFields((prev) =>
        prev.map((f) => (f.type === "stamp" ? { ...f, value: rawData } : f))
      );
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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

  // Load PDF when file is uploaded
  useEffect(() => {
    const rawFiles = upload.items
      .map((it) => it.file)
      .filter((f): f is File => f instanceof File);

    if (!rawFiles.length) {
      setPagePreviewUrl(null);
      pdfDocRef.current = null;
      setPlacedFields([]);
      return;
    }

    const loadFirstPdf = async () => {
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

        // Pre-place a default signature field in bottom-right area if none exists
        const initialSig = signatureDataUrl || signerName;
        setPlacedFields([
          {
            id: `field_sig_${Date.now()}`,
            type: "signature",
            page: 1,
            xPct: 60,
            yPct: 75,
            widthPct: 28,
            heightPct: 10,
            value: initialSig,
          },
        ]);
      } catch (err) {
        console.error("Failed to load PDF preview:", err);
      } finally {
        setLoadingDoc(false);
      }
    };

    loadFirstPdf();
  }, [upload.items, renderPdfPage]);

  // Page Switcher
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !pdfDocRef.current) return;
    setCurrentPage(newPage);
    renderPdfPage(pdfDocRef.current, newPage);
  };

  // Add field to current page
  const handleAddField = (type: FieldType) => {
    let defaultValue = "";
    let widthPct = 26;
    let heightPct = 8;

    if (type === "signature") {
      defaultValue = signatureDataUrl || signerName;
      widthPct = 28;
      heightPct = 10;
    } else if (type === "digital_seal") {
      defaultValue = `${signerName} • ${signerEmail}`;
      widthPct = 36;
      heightPct = 12;
    } else if (type === "initials") {
      defaultValue = initialsDataUrl || signerInitials;
      widthPct = 16;
      heightPct = 8;
    } else if (type === "name") {
      defaultValue = signerName;
      widthPct = 24;
      heightPct = 6;
    } else if (type === "date") {
      defaultValue = new Date().toISOString().split("T")[0]!;
      widthPct = 20;
      heightPct = 5;
    } else if (type === "text") {
      defaultValue = "Enter text here";
      widthPct = 24;
      heightPct = 6;
    } else if (type === "stamp") {
      defaultValue = stampDataUrl || "OFFICIAL STAMP";
      widthPct = 25;
      heightPct = 12;
    }

    const newField: PlacedField = {
      id: `field_${type}_${Date.now()}_${Math.random()}`,
      type,
      page: currentPage,
      xPct: 35 + Math.random() * 8,
      yPct: 40 + Math.random() * 12,
      widthPct,
      heightPct,
      value: defaultValue,
    };

    setPlacedFields((prev) => [...prev, newField]);
  };

  const handleRemoveField = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlacedFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Field drag on PDF canvas
  const handleFieldMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingFieldId(field.id);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      fieldXPct: field.xPct,
      fieldYPct: field.yPct,
    };
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!draggingFieldId || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const deltaXPct = ((e.clientX - dragStartPos.current.x) / rect.width) * 100;
    const deltaYPct = ((e.clientY - dragStartPos.current.y) / rect.height) * 100;

    setPlacedFields((prev) =>
      prev.map((f) => {
        if (f.id !== draggingFieldId) return f;
        const newX = Math.max(0, Math.min(100 - f.widthPct, dragStartPos.current.fieldXPct + deltaXPct));
        const newY = Math.max(0, Math.min(100 - f.heightPct, dragStartPos.current.fieldYPct + deltaYPct));
        return { ...f, xPct: newX, yPct: newY };
      })
    );
  };

  const handleContainerMouseUp = () => {
    setDraggingFieldId(null);
  };

  // Canvas drawing for signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveEditor = () => {
    let finalDataUrl = "";
    if (editorTab === "draw" && drawCanvasRef.current && hasDrawn) {
      finalDataUrl = drawCanvasRef.current.toDataURL("image/png");
      if (targetEditType === "signature") setIsUploadedImage(false);
    } else if (editorTab === "upload" && modalUploadedImage) {
      finalDataUrl = modalUploadedImage;
      if (targetEditType === "signature") setIsUploadedImage(true);
    } else if (editorTab === "type") {
      finalDataUrl = generateCalligraphyImage(
        targetEditType === "signature" ? signerName : signerInitials,
        fontFamily,
        penColor
      );
      if (targetEditType === "signature") setIsUploadedImage(false);
    }

    if (targetEditType === "signature") {
      setSignatureDataUrl(finalDataUrl);
      setPlacedFields((prev) =>
        prev.map((f) => (f.type === "signature" ? { ...f, value: finalDataUrl } : f))
      );
    } else {
      setInitialsDataUrl(finalDataUrl);
      setPlacedFields((prev) =>
        prev.map((f) => (f.type === "initials" ? { ...f, value: finalDataUrl } : f))
      );
    }
    setEditorModalOpen(false);
  };

  // Revert back from uploaded image to typed calligraphy
  const handleRevertToTyped = () => {
    setIsUploadedImage(false);
    const typedSig = generateCalligraphyImage(signerName, fontFamily, penColor);
    setSignatureDataUrl(typedSig);
    setPlacedFields((prev) =>
      prev.map((f) => (f.type === "signature" ? { ...f, value: typedSig } : f))
    );
  };

  // Prepare backend payload with all digital signature and field coordinates
  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      const pageW = 595.0; // Standard A4 width in pt (72 dpi)
      const pageH = 842.0; // Standard A4 height in pt

      const normalizedFields = placedFields.map((f) => ({
        type: f.type,
        page: f.page,
        x: (f.xPct / 100) * pageW,
        y: (f.yPct / 100) * pageH,
        width: (f.widthPct / 100) * pageW,
        height: (f.heightPct / 100) * pageH,
        value:
          f.type === "digital_seal"
            ? `${signerName.trim() || "Authorized Signatory"} <${signerEmail.trim() || "signer@varolline.com"}>`
            : f.value,
      }));

      return {
        input_file_id: files[0]!.id,
        options: {
          signature_type: signatureType,
          signer_name: signerName.trim() || "Authorized Signatory",
          signer_email: signerEmail.trim() || "signer@varolline.com",
          organization: signerOrg.trim() || "Varolline Verified Organization",
          signing_reason: signingReason,
          signing_location: signingLocation.trim() || "Online Signature Platform",
          compliance_level: complianceLevel,
          lock_document: signatureType === "digital" && lockDocument,
          attach_audit_page: signatureType === "digital" && attachAuditPage,
          add_audit_trail: signatureType === "digital",
          fields: normalizedFields,
        },
      };
    },
    [
      placedFields,
      signatureType,
      signerName,
      signerEmail,
      signerOrg,
      signingReason,
      signingLocation,
      complianceLevel,
      lockDocument,
      attachAuditPage,
    ]
  );

  return (
    <ToolLayout
      tool={tool}
      upload={upload}
      getJobOptions={getJobOptions}
      actionLabel={
        <span className="flex items-center justify-center gap-2 text-base font-bold text-white tracking-wide">
          <span>{signatureType === "digital" ? "Sign & Certify" : "Sign"}</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
            <ArrowRight className="h-4 w-4 text-white" />
          </span>
        </span>
      }
      actionClassName={cn(
        "text-white py-6 rounded-2xl shadow-lg border-0 transition-all hover:scale-[1.01]",
        signatureType === "digital"
          ? "bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 shadow-amber-500/20"
          : "bg-[#f27474] hover:bg-[#e06363]"
      )}
    >
      {/* Hidden File Input for Direct Signature Upload from Computer */}
      <input
        ref={signatureFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleSignatureFileUpload}
      />
      {/* Hidden File Input for Stamp Upload */}
      <input
        ref={stampFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleStampFileUpload}
      />

      <div className="space-y-6">
        {/* Top Signature Type Switcher (Simple vs Digital) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Simple Signature Card */}
          <button
            type="button"
            onClick={() => setSignatureType("simple")}
            className={cn(
              "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center select-none cursor-pointer",
              signatureType === "simple"
                ? "border-red-500 bg-red-500/5 shadow-md shadow-red-500/10 ring-1 ring-red-500/30"
                : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
            )}
          >
            {/* SVG Flourish with Pen Nib */}
            <div className="flex items-center justify-center h-10 mb-2">
              <svg className="w-20 h-10 overflow-visible" viewBox="0 0 100 40" fill="none">
                <path
                  d="M10 28 C 30 10, 45 35, 70 20"
                  stroke={signatureType === "simple" ? "#ef4444" : "#94a3b8"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <g transform="translate(68, 8) rotate(35)">
                  <path
                    d="M0 0 L10 6 L0 12 L-6 6 Z"
                    fill={signatureType === "simple" ? "#ef4444" : "#94a3b8"}
                  />
                  <line x1="0" y1="6" x2="-4" y2="6" stroke="#ffffff" strokeWidth="1" />
                </g>
              </svg>
            </div>
            <span
              className={cn(
                "text-sm font-bold tracking-tight transition-colors",
                signatureType === "simple" ? "text-red-500" : "text-muted-foreground"
              )}
            >
              Simple Signature
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Standard visual handwritten signature
            </span>
          </button>

          {/* Digital Signature Card */}
          <button
            type="button"
            onClick={() => {
              setSignatureType("digital");
              setPlacedFields((prev) => {
                if (prev.some((f) => f.type === "digital_seal")) return prev;
                return [
                  ...prev,
                  {
                    id: `field_seal_${Date.now()}`,
                    type: "digital_seal",
                    page: 1,
                    xPct: 56,
                    yPct: 68,
                    widthPct: 38,
                    heightPct: 14,
                    value: "digital_seal",
                  },
                ];
              });
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center select-none cursor-pointer",
              signatureType === "digital"
                ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/30"
                : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
            )}
          >
            {/* SVG Flourish with Award Ribbon Seal */}
            <div className="flex items-center justify-center h-10 mb-2">
              <svg className="w-20 h-10 overflow-visible" viewBox="0 0 100 40" fill="none">
                <path
                  d="M10 28 C 30 15, 50 32, 65 20"
                  stroke={signatureType === "digital" ? "#f59e0b" : "#94a3b8"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <g transform="translate(68, 6)">
                  <circle cx="8" cy="8" r="7" fill={signatureType === "digital" ? "#f59e0b" : "#94a3b8"} />
                  <path d="M5 14 L3 22 L8 19 L13 22 L11 14" fill={signatureType === "digital" ? "#f59e0b" : "#94a3b8"} />
                </g>
              </svg>
            </div>
            <span
              className={cn(
                "text-sm font-bold tracking-tight transition-colors flex items-center gap-1.5",
                signatureType === "digital" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}
            >
              Digital Signature
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              eIDAS Certified & Legal Audit Trail
            </span>
          </button>
        </div>

        {/* 2-Column Workflow: Sidebar Fields & Document Canvas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Required & Optional Fields / Digital Options */}
          <div className="md:col-span-5 space-y-4">
            {/* DIGITAL SIGNATURE CONFIGURATION PANEL (Shows when Digital Signature is selected) */}
            {signatureType === "digital" && (
              <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-800/80 bg-gradient-to-b from-amber-50/70 to-card dark:from-amber-950/20 dark:to-card p-4 space-y-4 shadow-sm animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="flex items-start justify-between border-b border-amber-200/80 dark:border-amber-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-amber-950 shadow-xs">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>{complianceLevel === "aes" ? "Advanced Digital ID (AES)" : "Qualified Certificate ID (QES)"}</span>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                          {complianceLevel === "aes" ? "AES-256 Validated" : "eIDAS QES Compliant"}
                        </span>
                      </h4>
                      <p className="text-[10.5px] text-muted-foreground">
                        {complianceLevel === "aes"
                          ? "SHA-256 cryptographic hash & 256-bit tamper-evident digital seal"
                          : "Qualified cryptographic seal & verifiable legal audit trail"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Identity Inputs (Empty by default for user to fill) */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-amber-600" /> Signer Full Name
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => handleSignerNameChange(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                      placeholder="Enter your full name..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-amber-600" /> Signer Email
                    </label>
                    <input
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                      placeholder="Enter your email address..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Building className="h-3 w-3 text-amber-600" /> Organization / Company
                    </label>
                    <input
                      type="text"
                      value={signerOrg}
                      onChange={(e) => setSignerOrg(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                      placeholder="Enter company / organization name (optional)..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-600" /> Signing Reason
                    </label>
                    <select
                      value={signingReason}
                      onChange={(e) => setSigningReason(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                    >
                      {SIGNING_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-amber-600" /> Signing Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={signingLocation}
                      onChange={(e) => setSigningLocation(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                      placeholder="Enter city, country (optional)..."
                    />
                  </div>
                </div>

                {/* Compliance & Cryptography Settings */}
                <div className="space-y-2 border-t border-amber-200/80 dark:border-amber-800/60 pt-3">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <SlidersHorizontal className="h-3 w-3 text-amber-600" /> Security Options & Toggles
                  </span>

                  {/* Level selector */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 dark:bg-slate-950 border border-slate-700/60 shadow-inner text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setComplianceLevel("qes");
                        setEmbedTimestamp(true);
                        setPlacedFields((prev) => {
                          if (prev.some((f) => f.type === "digital_seal")) return prev;
                          return [
                            ...prev,
                            {
                              id: `field_seal_${Date.now()}`,
                              type: "digital_seal",
                              page: 1,
                              xPct: 56,
                              yPct: 68,
                              widthPct: 38,
                              heightPct: 14,
                              value: "digital_seal",
                            },
                          ];
                        });
                      }}
                      className={cn(
                        "py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                        complianceLevel === "qes"
                          ? "bg-slate-800 text-sky-400 font-bold border border-sky-500/50 shadow-xs"
                          : "text-sky-400/80 hover:text-sky-300 hover:bg-slate-800/40"
                      )}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Qualified (QES)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComplianceLevel("aes");
                        setEmbedTimestamp(true);
                        setPlacedFields((prev) => {
                          if (prev.some((f) => f.type === "digital_seal")) return prev;
                          return [
                            ...prev,
                            {
                              id: `field_seal_${Date.now()}`,
                              type: "digital_seal",
                              page: 1,
                              xPct: 56,
                              yPct: 68,
                              widthPct: 38,
                              heightPct: 14,
                              value: "digital_seal",
                            },
                          ];
                        });
                      }}
                      className={cn(
                        "py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                        complianceLevel === "aes"
                          ? "bg-black/90 text-amber-400 font-bold border border-amber-500/60 shadow-xs ring-1 ring-amber-500/30"
                          : "text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/40"
                      )}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Advanced (AES)</span>
                    </button>
                  </div>

                  {/* Active Level Explanatory Card */}
                  <div className="rounded-xl p-2.5 bg-amber-500/10 border border-amber-500/25 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                      {complianceLevel === "aes" ? (
                        <>
                          <Lock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Advanced Electronic Signature (AES) Mode</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                          <span>Qualified Electronic Signature (QES) Mode</span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {complianceLevel === "aes"
                        ? "Applies a cryptographic SHA-256 tamper-evident seal and 256-bit hash bound to the signatory under eIDAS Art. 26 & US ESIGN Act."
                        : "Highest legal weight under EU eIDAS with qualified RFC 3161 timestamp authority and comprehensive audit certificate."}
                    </p>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-foreground">
                      <input
                        type="checkbox"
                        checked={embedTimestamp}
                        onChange={(e) => setEmbedTimestamp(e.target.checked)}
                        className="rounded border-border text-amber-600 focus:ring-amber-500"
                      />
                      <span>RFC 3161 Qualified UTC Timestamp</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-foreground">
                      <input
                        type="checkbox"
                        checked={lockDocument}
                        onChange={(e) => setLockDocument(e.target.checked)}
                        className="rounded border-border text-amber-600 focus:ring-amber-500"
                      />
                      <span>Lock PDF document after signing (tamper-evident)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-foreground">
                      <input
                        type="checkbox"
                        checked={attachAuditPage}
                        onChange={(e) => setAttachAuditPage(e.target.checked)}
                        className="rounded border-border text-amber-600 focus:ring-amber-500"
                      />
                      <span>Append Legal Audit Trail certificate page</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Required Fields Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Required fields
                </h3>
                {isUploadedImage && (
                  <button
                    type="button"
                    onClick={handleRevertToTyped}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Reset to typed
                  </button>
                )}
              </div>

              {/* Signature Field Card (Matches Screenshot + Direct Computer Upload) */}
              <div className="group relative flex items-center gap-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 shadow-xs transition-all hover:border-blue-300 dark:hover:border-blue-800">
                {/* Drag Handle */}
                <span className="text-muted-foreground/60 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </span>

                {/* Blue Square with Pen Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <Pencil className="h-4 w-4" />
                </div>

                {/* Dashed Bounding Box with Label and Signature Preview */}
                <div
                  onClick={() => handleAddField("signature")}
                  className="flex-1 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800/80 bg-white/80 dark:bg-black/40 px-3 py-1.5 cursor-pointer hover:bg-white dark:hover:bg-black/60 transition-colors"
                  title="Click to place signature on page"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider leading-none">
                      Signature
                    </p>
                    {isUploadedImage && (
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded">
                        From PC
                      </span>
                    )}
                  </div>

                  {/* Visual Signature representation */}
                  {isUploadedImage && signatureDataUrl ? (
                    <div className="h-8 flex items-center justify-center mt-0.5">
                      <img
                        src={signatureDataUrl}
                        alt="Uploaded Signature"
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "text-base truncate select-none mt-0.5",
                        !signerName ? "text-muted-foreground/60 italic font-sans text-xs" : "text-foreground"
                      )}
                      style={{ fontFamily: signerName ? fontFamily : undefined }}
                    >
                      {signerName || "Click to add or type name"}
                    </p>
                  )}
                </div>

                {/* Direct Upload from Computer Icon Button */}
                <button
                  type="button"
                  onClick={() => signatureFileInputRef.current?.click()}
                  className="rounded-lg p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  title="Upload signature image from computer"
                >
                  <FolderUp className="h-4 w-4" />
                </button>

                {/* Edit Button (Opens Modal with Type / Draw / Upload tabs) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetEditType("signature");
                    setEditorModalOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  title="Edit signature typography or draw"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Direct Full-Width "Upload Signature from Computer" Button */}
              <button
                type="button"
                onClick={() => signatureFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-all hover:scale-[1.005] cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Signature from Computer (PNG/JPG)</span>
              </button>

              {/* If Digital Signature is Active: Dedicated Digital Seal Field */}
              {signatureType === "digital" && (
                <div
                  onClick={() => handleAddField("digital_seal")}
                  className="group flex items-center gap-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/10 p-2.5 shadow-xs transition-all hover:border-amber-500 cursor-pointer"
                  title="Click to place Digital Certificate Seal on page"
                >
                  <span className="text-amber-700 dark:text-amber-300 cursor-grab">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-amber-950 font-bold shadow-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      {complianceLevel === "aes" ? "Advanced (AES) Digital Seal" : "Qualified (QES) Certificate Seal"}
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">
                      {complianceLevel === "aes" ? "Place SHA-256 cryptographic seal" : "Place eIDAS qualified audit seal"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                    + Place
                  </span>
                </div>
              )}
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Optional fields
              </h3>

              {/* 1. Initials Field Card */}
              <div className="group relative flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-xs transition-all hover:border-primary/50">
                <span className="text-muted-foreground/60 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </span>

                {/* Blue Square with AC Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs tracking-tighter underline">
                  AC
                </div>

                <div
                  onClick={() => handleAddField("initials")}
                  className="flex-1 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-900/60 bg-muted/30 px-3 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                  title="Click to place initials on page"
                >
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider leading-none">
                    Initials
                  </p>
                  <p
                    className={cn(
                      "text-base truncate select-none mt-0.5",
                      !signerInitials ? "text-muted-foreground/60 italic font-sans text-xs" : "text-foreground"
                    )}
                    style={{ fontFamily: signerInitials ? fontFamily : undefined }}
                  >
                    {signerInitials || "Initials"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetEditType("initials");
                    setEditorModalOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Edit initials"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 2. Name Field Card */}
              <div
                onClick={() => handleAddField("name")}
                className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-xs transition-all hover:border-primary/50 cursor-pointer"
                title="Click to place signer name on page"
              >
                <span className="text-muted-foreground/60">
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">Name</span>
              </div>

              {/* 3. Date Field Card */}
              <div
                onClick={() => handleAddField("date")}
                className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-xs transition-all hover:border-primary/50 cursor-pointer"
                title="Click to place date stamp on page"
              >
                <span className="text-muted-foreground/60">
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">Date</span>
              </div>

              {/* 4. Text Field Card */}
              <div
                onClick={() => handleAddField("text")}
                className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-xs transition-all hover:border-primary/50 cursor-pointer"
                title="Click to place text annotation on page"
              >
                <span className="text-muted-foreground/60">
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Type className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">Text</span>
              </div>

              {/* 5. Company Stamp Field Card (with quick upload from computer) */}
              <div className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-2.5 shadow-xs transition-all hover:border-primary/50">
                <div
                  onClick={() => handleAddField("stamp")}
                  className="flex items-center gap-2.5 flex-1 cursor-pointer"
                  title="Click to place company stamp seal on page"
                >
                  <span className="text-muted-foreground/60">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Stamp className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Company Stamp</span>
                </div>

                <button
                  type="button"
                  onClick={() => stampFileInputRef.current?.click()}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Upload stamp image from computer"
                >
                  <FolderUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Document Canvas & Field Placement */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>Document Preview & Placement</span>
                {signatureType === "digital" && (
                  <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5">
                    Digital Mode Active
                  </span>
                )}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Document Surface */}
            <div
              ref={canvasContainerRef}
              onMouseMove={handleContainerMouseMove}
              onMouseUp={handleContainerMouseUp}
              className="relative w-full aspect-[1/1.414] rounded-xl border-2 border-border/80 bg-muted/20 overflow-hidden shadow-inner flex items-center justify-center select-none"
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
                  <p className="text-xs font-medium">Select a PDF file above to preview and sign</p>
                </div>
              )}

              {/* Render Placed Fields on this Page */}
              {!loadingDoc &&
                placedFields
                  .filter((f) => f.page === currentPage)
                  .map((field) => (
                    <div
                      key={field.id}
                      onMouseDown={(e) => handleFieldMouseDown(e, field)}
                      style={{
                        left: `${field.xPct}%`,
                        top: `${field.yPct}%`,
                        width: `${field.widthPct}%`,
                        height: `${field.heightPct}%`,
                      }}
                      className={cn(
                        "absolute group flex items-center justify-center rounded-lg border-2 border-dashed p-1 cursor-move transition-shadow backdrop-blur-xs",
                        field.type === "digital_seal"
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-blue-500 bg-blue-500/10",
                        draggingFieldId === field.id
                          ? "ring-2 ring-primary shadow-lg cursor-grabbing"
                          : "hover:border-primary hover:bg-primary/20 shadow-xs"
                      )}
                    >
                      {/* Delete Cross */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveField(field.id, e)}
                        className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs hover:scale-110 transition-transform z-10"
                        title="Remove field"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>

                      {/* Content inside field */}
                      {field.type === "signature" || field.type === "initials" ? (
                        field.value.startsWith("data:image") ? (
                          <img
                            src={field.value}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain pointer-events-none"
                          />
                        ) : (
                          <span
                            className="text-xs text-foreground font-semibold truncate pointer-events-none select-none"
                            style={{ fontFamily }}
                          >
                            {field.value}
                          </span>
                        )
                      ) : field.type === "digital_seal" ? (
                        <div
                          className={cn(
                            "w-full h-full flex flex-col justify-between rounded p-1 shadow-2xs text-left pointer-events-none transition-all",
                            complianceLevel === "aes"
                              ? "bg-amber-50/95 dark:bg-amber-950/85 border border-amber-500/80"
                              : "bg-sky-50/95 dark:bg-sky-950/85 border border-sky-500/80"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-between border-b pb-0.5",
                              complianceLevel === "aes"
                                ? "border-amber-300 dark:border-amber-800/80"
                                : "border-sky-300 dark:border-sky-800/80"
                            )}
                          >
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-tight",
                                complianceLevel === "aes"
                                  ? "text-amber-800 dark:text-amber-300"
                                  : "text-sky-800 dark:text-sky-300"
                              )}
                            >
                              {complianceLevel === "aes" ? (
                                <Lock className="h-2.5 w-2.5 text-amber-600" />
                              ) : (
                                <ShieldCheck className="h-2.5 w-2.5 text-sky-600" />
                              )}
                              {complianceLevel === "aes" ? "Advanced Signature (AES)" : "Digitally Certified (QES)"}
                            </span>
                            <span
                              className={cn(
                                "text-[6.5px] font-mono font-bold px-1 py-0.2 rounded",
                                complianceLevel === "aes"
                                  ? "bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                                  : "bg-sky-200/60 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200"
                              )}
                            >
                              {complianceLevel === "aes" ? "SHA-256" : "eIDAS"}
                            </span>
                          </div>
                          <div className="text-[7.5px] leading-tight text-foreground truncate mt-0.5">
                            <p className="font-bold">{signerName.trim() || "Signer Name"}</p>
                            <p className="text-muted-foreground truncate">{signerEmail.trim() || "signer@varolline.com"}</p>
                          </div>
                          <div
                            className={cn(
                              "text-[6.5px] font-mono mt-0.5 truncate",
                              complianceLevel === "aes"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-sky-700 dark:text-sky-400"
                            )}
                          >
                            {new Date().toISOString().split("T")[0]} • {complianceLevel === "aes" ? "AES Cryptographic Seal" : "Qualified Seal"}
                          </div>
                        </div>
                      ) : field.type === "stamp" ? (
                        <div className="flex flex-col items-center justify-center text-rose-600 border border-rose-500/50 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider pointer-events-none">
                          <Stamp className="h-3 w-3 mb-0.5" />
                          <span>{field.value}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-foreground truncate pointer-events-none select-none">
                          {field.value}
                        </span>
                      )}
                    </div>
                  ))}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Click any field on the left to add it to the page. Drag fields on the document to reposition.
            </p>
          </div>
        </div>
      </div>

      {/* Signature & Initials Customization Modal (Type, Draw, Upload from Computer) */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-semibold text-sm text-foreground">
                Customize {targetEditType === "signature" ? "Signature" : "Initials"}
              </h3>
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs: Type, Draw, Upload */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditorTab("type")}
                className={cn(
                  "py-1.5 rounded-lg transition-all",
                  editorTab === "type"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Type
              </button>
              <button
                type="button"
                onClick={() => setEditorTab("draw")}
                className={cn(
                  "py-1.5 rounded-lg transition-all",
                  editorTab === "draw"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Draw
              </button>
              <button
                type="button"
                onClick={() => setEditorTab("upload")}
                className={cn(
                  "py-1.5 rounded-lg transition-all",
                  editorTab === "upload"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Upload from PC
              </button>
            </div>

            {/* Tab 1: Type */}
            {editorTab === "type" && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {targetEditType === "signature" ? "Full Name" : "Initials"}
                  </label>
                  <input
                    type="text"
                    value={targetEditType === "signature" ? signerName : signerInitials}
                    onChange={(e) =>
                      targetEditType === "signature"
                        ? handleSignerNameChange(e.target.value)
                        : setSignerInitials(e.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    placeholder={targetEditType === "signature" ? "Enter your full name..." : "Enter your initials..."}
                  />
                </div>

                {/* Font Choices */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Calligraphy Font</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {CALLIGRAPHY_FONTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontFamily(f.font)}
                        className={cn(
                          "rounded-xl border p-2 text-center text-sm truncate transition-all",
                          fontFamily === f.font
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border/70 bg-card hover:bg-muted/40 text-foreground"
                        )}
                        style={{ fontFamily: f.font }}
                      >
                        {targetEditType === "signature" ? signerName || f.name : signerInitials || "Initials"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selector */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-medium text-muted-foreground">Ink Color:</span>
                  {[
                    { label: "Black", color: "#0f172a" },
                    { label: "Blue", color: "#1e40af" },
                    { label: "Red", color: "#b91c1c" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setPenColor(c.color)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform",
                        penColor === c.color ? "scale-110 border-primary" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Draw */}
            {editorTab === "draw" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Draw using your mouse or finger:</span>
                  <button
                    type="button"
                    onClick={clearDrawCanvas}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="rounded-xl border border-dashed border-border bg-white overflow-hidden shadow-inner">
                  <canvas
                    ref={drawCanvasRef}
                    width={380}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-[130px] cursor-crosshair touch-none"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Upload from Computer */}
            {editorTab === "upload" && (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                  <Upload className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-xs font-semibold text-foreground">
                    Click to select signature image from computer
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    PNG, JPG, SVG or WEBP (paper photo or transparent)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const rawB64 = evt.target?.result as string;
                        if (autoRemoveBg) {
                          cleanSignatureBackground(rawB64, (cleaned) => {
                            setModalUploadedImage(cleaned);
                          });
                        } else {
                          setModalUploadedImage(rawB64);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>

                {modalUploadedImage && (
                  <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                    <p className="text-[11px] font-medium text-foreground">Preview:</p>
                    <div className="h-16 flex items-center justify-center bg-white dark:bg-black/40 rounded-lg p-2 border border-border">
                      <img
                        src={modalUploadedImage}
                        alt="Signature preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={autoRemoveBg}
                    onChange={(e) => setAutoRemoveBg(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Automatically make white paper background transparent</span>
                </label>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditor}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
