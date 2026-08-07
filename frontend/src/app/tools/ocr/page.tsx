import type { Metadata } from "next";
import { OcrClient } from "./ocr-client";

export const metadata: Metadata = {
  title: "OCR Text Extraction — Extract Text from Scanned PDF | Varolline Docs",
  description: "Use OCR to extract text from scanned PDFs and images. Powered by Tesseract.",
};

export default function OcrPage() {
  return <OcrClient />;
}
