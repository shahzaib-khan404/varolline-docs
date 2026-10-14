import type { Metadata } from "next";
import { RepairPdfClient } from "./repair-client";

export const metadata: Metadata = {
  title: "Repair PDF — Fix Damaged & Corrupted Files Online | uLovepdf",
  description:
    "Repair damaged, corrupted, or unreadable PDF files online. Rebuild broken XREF tables and restore document readability.",
};

export default function RepairPdfPage() {
  return <RepairPdfClient />;
}
