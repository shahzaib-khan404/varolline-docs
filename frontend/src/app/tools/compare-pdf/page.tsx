import type { Metadata } from "next";
import { ComparePdfClient } from "./compare-client";

export const metadata: Metadata = {
  title: "Compare PDF — Side-by-Side Visual & Text Difference Checker | uLovepdf",
  description:
    "Compare two PDF documents side-by-side online. Highlight added, deleted, and modified text with an automated executive comparison summary report.",
};

export default function ComparePdfPage() {
  return <ComparePdfClient />;
}
