import type { Metadata } from "next";
import { PdfToPdfaClient } from "./pdfa-client";

export const metadata: Metadata = {
  title: "PDF to PDF/A — ISO 19005 Archival Document Conversion | uLovepdf",
  description:
    "Convert PDF documents to PDF/A (ISO 19005 standard) for long-term digital preservation. Embeds device-independent color spaces, fonts, and clean object streams.",
};

export default function PdfToPdfaPage() {
  return <PdfToPdfaClient />;
}
