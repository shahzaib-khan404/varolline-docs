import type { Metadata } from "next";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";

export const metadata: Metadata = {
  title: "PDF to Word — Convert PDF to DOCX Online | uLovepdf",
  description: "Convert any PDF to an editable Word document. Powered by LibreOffice.",
};

export default function PdfToWordPage() {
  return <ToolLayout tool={TOOL_BY_ID["pdf_to_word"]} actionLabel="Convert to Word" />;
}
