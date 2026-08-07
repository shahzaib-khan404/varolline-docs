import type { Metadata } from "next";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";

export const metadata: Metadata = {
  title: "Word to PDF — Convert DOCX to PDF Online | Varolline Docs",
  description: "Convert Word documents to PDF with perfect layout fidelity.",
};

export default function WordToPdfPage() {
  return <ToolLayout tool={TOOL_BY_ID["word_to_pdf"]} actionLabel="Convert to PDF" />;
}
