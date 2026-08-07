import type { Metadata } from "next";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";

export const metadata: Metadata = {
  title: "Merge PDF — Combine PDF Files Online | Varolline Docs",
  description:
    "Merge multiple PDF files into one document for free. No signup required to try.",
};

export default function MergePdfPage() {
  return (
    <ToolLayout
      tool={TOOL_BY_ID["merge_pdf"]}
      multiFile
      actionLabel="Merge PDFs"
    />
  );
}
