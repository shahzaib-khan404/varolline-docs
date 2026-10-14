import type { Metadata } from "next";
import { ExcelToPdfClient } from "./excel-client";

export const metadata: Metadata = {
  title: "Excel to PDF — Convert XLSX, XLS & CSV to PDF Online | uLovepdf",
  description:
    "Convert your Excel spreadsheets (.xlsx, .xls) and CSV sheets to PDF documents online. Maintains table borders, cell formatting, and auto-paginates wide sheets.",
};

export default function ExcelToPdfPage() {
  return <ExcelToPdfClient />;
}
