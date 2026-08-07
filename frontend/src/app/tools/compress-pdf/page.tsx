import type { Metadata } from "next";
import { CompressPdfClient } from "./compress-client";

export const metadata: Metadata = {
  title: "Compress PDF — Reduce PDF File Size Online | Varolline Docs",
  description:
    "Compress PDF files with Ghostscript. Choose between screen, eBook, printer, and prepress quality presets.",
};

export default function CompressPdfPage() {
  return <CompressPdfClient />;
}
