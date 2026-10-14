import type { Metadata } from "next";
import { PdfToExcelClient } from "./pdf-to-excel-client";

export const metadata: Metadata = {
  title: "PDF to Excel — Extract Tables from PDF to XLSX Online | uLovepdf",
  description:
    "Extract tables, financial statements, and structured data from PDF files directly into editable Microsoft Excel (.xlsx) spreadsheets with accurate column detection.",
};

export default function PdfToExcelPage() {
  return <PdfToExcelClient />;
}
