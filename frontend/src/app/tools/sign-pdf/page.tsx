import type { Metadata } from "next";
import { SignPdfClient } from "./sign-client";

export const metadata: Metadata = {
  title: "Sign PDF — Add Digital & Handwritten Signatures Online | uLovepdf",
  description:
    "Sign PDF documents online. Draw your electronic signature, type your name in calligraphic script, or place verified audit trail certification stamps.",
};

export default function SignPdfPage() {
  return <SignPdfClient />;
}
