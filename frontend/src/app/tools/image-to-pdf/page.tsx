import type { Metadata } from "next";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";

export const metadata: Metadata = {
  title: "Image to PDF — Convert JPG/PNG to PDF | uLovepdf",
  description: "Convert one or more images into a single PDF document.",
};

export default function ImageToPdfPage() {
  return (
    <ToolLayout
      tool={TOOL_BY_ID["image_to_pdf"]}
      multiFile
      actionLabel="Convert to PDF"
    />
  );
}
