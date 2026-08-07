import type { Metadata } from "next";
import { SplitPdfClient } from "./split-client";

export const metadata: Metadata = {
  title: "Split PDF — Extract Pages Online | Varolline Docs",
  description:
    "Split a PDF into individual pages, custom page ranges, or equal chunks. Free and fast.",
};

export default function SplitPdfPage() {
  return <SplitPdfClient />;
}
