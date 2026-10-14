import type { Metadata } from "next";
import { ToolsGrid } from "@/components/features/landing/tools-grid";

export const metadata: Metadata = {
  title: "All PDF Tools — uLovepdf",
  description:
    "Browse all 12 free document processing tools — merge, split, compress, convert, and protect your PDFs.",
};

export default function ToolsPage() {
  return <ToolsGrid />;
}
