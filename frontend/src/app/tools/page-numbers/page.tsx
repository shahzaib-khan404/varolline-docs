import type { Metadata } from "next";
import { PageNumbersClient } from "./page-numbers-client";

export const metadata: Metadata = {
  title: "Add Page Numbers to PDF — Custom Headers & Footers | uLovepdf",
  description:
    "Add page numbers to PDF documents with ease. Choose position, typography, numbering format, and starting page.",
};

export default function PageNumbersPage() {
  return <PageNumbersClient />;
}
