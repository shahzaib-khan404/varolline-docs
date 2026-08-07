import type { Metadata } from "next";
import { WatermarkPdfClient } from "./watermark-client";

export const metadata: Metadata = {
  title: "Watermark PDF — Add Text Watermark to PDF | Varolline Docs",
  description: "Add a custom text watermark to all pages of your PDF document.",
};

export default function WatermarkPdfPage() {
  return <WatermarkPdfClient />;
}
