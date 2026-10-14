import type { Metadata } from "next";
import { OcrPdfClient } from "./ocr-client";

export const metadata: Metadata = {
  title: "OCR PDF — Convert Scanned PDFs to Searchable Documents Online | uLovepdf",
  description:
    "Convert scanned PDF documents and images into selectable, searchable, and copyable PDF files with high-precision optical character recognition.",
};

export default function OcrPdfPage() {
  return <OcrPdfClient />;
}
