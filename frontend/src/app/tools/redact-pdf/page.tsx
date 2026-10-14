import type { Metadata } from "next";
import { RedactPdfClient } from "./redact-client";

export const metadata: Metadata = {
  title: "Redact PDF — Permanently Black Out & Remove Sensitive Text | uLovepdf",
  description:
    "Permanently redact sensitive text, social security numbers, and private data from PDF files. True cryptographic byte purging prevents data recovery.",
};

export default function RedactPdfPage() {
  return <RedactPdfClient />;
}
