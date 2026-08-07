/**
 * Master configuration for all 12 processing tools.
 * Used by the UI to render cards, routes, and accepted file types.
 */

import type { ProcessingTool } from "@/types/api";

export interface ToolConfig {
  id: ProcessingTool;
  name: string;
  description: string;
  icon: string;        // Lucide icon name
  color: string;       // Tailwind bg color
  textColor: string;   // Tailwind text color
  category: "pdf" | "convert" | "organize" | "protect";
  acceptedTypes: string[];
  route: string;
  maxFiles: number;
}

export const TOOLS: ToolConfig[] = [
  {
    id: "merge_pdf",
    name: "Merge PDF",
    description: "Combine multiple PDF files into one seamlessly.",
    icon: "Combine",
    color: "bg-red-500",
    textColor: "text-red-600",
    category: "pdf",
    acceptedTypes: ["application/pdf"],
    route: "/tools/merge-pdf",
    maxFiles: 20,
  },
  {
    id: "split_pdf",
    name: "Split PDF",
    description: "Extract pages or split a PDF into multiple files.",
    icon: "Scissors",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    category: "pdf",
    acceptedTypes: ["application/pdf"],
    route: "/tools/split-pdf",
    maxFiles: 1,
  },
  {
    id: "compress_pdf",
    name: "Compress PDF",
    description: "Reduce PDF file size while maintaining quality.",
    icon: "Archive",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    category: "pdf",
    acceptedTypes: ["application/pdf"],
    route: "/tools/compress-pdf",
    maxFiles: 1,
  },
  {
    id: "pdf_to_image",
    name: "PDF to Image",
    description: "Convert PDF pages to JPG or PNG images.",
    icon: "Image",
    color: "bg-green-500",
    textColor: "text-green-600",
    category: "convert",
    acceptedTypes: ["application/pdf"],
    route: "/tools/pdf-to-image",
    maxFiles: 1,
  },
  {
    id: "image_to_pdf",
    name: "Image to PDF",
    description: "Convert JPG or PNG images to a PDF document.",
    icon: "FileImage",
    color: "bg-teal-500",
    textColor: "text-teal-600",
    category: "convert",
    acceptedTypes: ["image/jpeg", "image/png"],
    route: "/tools/image-to-pdf",
    maxFiles: 20,
  },
  {
    id: "pdf_to_word",
    name: "PDF to Word",
    description: "Convert PDF to an editable Word document.",
    icon: "FileText",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    category: "convert",
    acceptedTypes: ["application/pdf"],
    route: "/tools/pdf-to-word",
    maxFiles: 1,
  },
  {
    id: "word_to_pdf",
    name: "Word to PDF",
    description: "Convert Word documents to PDF with perfect fidelity.",
    icon: "FilePlus",
    color: "bg-indigo-500",
    textColor: "text-indigo-600",
    category: "convert",
    acceptedTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
    route: "/tools/word-to-pdf",
    maxFiles: 1,
  },
  {
    id: "rotate_pdf",
    name: "Rotate PDF",
    description: "Rotate PDF pages to the correct orientation.",
    icon: "RotateCw",
    color: "bg-violet-500",
    textColor: "text-violet-600",
    category: "organize",
    acceptedTypes: ["application/pdf"],
    route: "/tools/rotate-pdf",
    maxFiles: 1,
  },
  {
    id: "delete_pages",
    name: "Delete Pages",
    description: "Remove unwanted pages from your PDF.",
    icon: "Trash2",
    color: "bg-pink-500",
    textColor: "text-pink-600",
    category: "organize",
    acceptedTypes: ["application/pdf"],
    route: "/tools/delete-pages",
    maxFiles: 1,
  },
  {
    id: "watermark_pdf",
    name: "Watermark PDF",
    description: "Add a text or image watermark to your PDF.",
    icon: "Droplets",
    color: "bg-cyan-500",
    textColor: "text-cyan-600",
    category: "protect",
    acceptedTypes: ["application/pdf"],
    route: "/tools/watermark-pdf",
    maxFiles: 1,
  },
  {
    id: "password_protect",
    name: "Protect PDF",
    description: "Encrypt and password-protect your PDF file.",
    icon: "Lock",
    color: "bg-slate-600",
    textColor: "text-slate-700",
    category: "protect",
    acceptedTypes: ["application/pdf"],
    route: "/tools/protect-pdf",
    maxFiles: 1,
  },
  {
    id: "ocr_extraction",
    name: "OCR Text",
    description: "Extract text from scanned PDFs and images using OCR.",
    icon: "ScanText",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
    category: "convert",
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"],
    route: "/tools/ocr",
    maxFiles: 1,
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<
  ProcessingTool,
  ToolConfig
>;

export const TOOL_CATEGORIES = {
  pdf: TOOLS.filter((t) => t.category === "pdf"),
  convert: TOOLS.filter((t) => t.category === "convert"),
  organize: TOOLS.filter((t) => t.category === "organize"),
  protect: TOOLS.filter((t) => t.category === "protect"),
};
