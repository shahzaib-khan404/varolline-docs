import type { Metadata } from "next";
import { HtmlToPdfClient } from "./html-to-pdf-client";

export const metadata: Metadata = {
  title: "HTML to PDF — Convert Webpages & HTML Code to PDF Online | uLovepdf",
  description:
    "Convert HTML files, reports, and code to clean, paginated PDF documents with custom page sizes and margins using native layout engines.",
};

export default function HtmlToPdfPage() {
  return <HtmlToPdfClient />;
}
