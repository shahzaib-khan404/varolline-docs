import type { Metadata } from "next";
import { PowerPointToPdfClient } from "./powerpoint-client";

export const metadata: Metadata = {
  title: "PowerPoint to PDF — Convert PPT & PPTX to PDF Online | uLovepdf",
  description:
    "Convert your PowerPoint presentations (PPT, PPTX) to high-quality PDF slides with vector clarity, intact fonts, and perfect layout alignment.",
};

export default function PowerPointToPdfPage() {
  return <PowerPointToPdfClient />;
}
