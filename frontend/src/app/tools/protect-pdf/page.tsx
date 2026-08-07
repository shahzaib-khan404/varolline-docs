import type { Metadata } from "next";
import { ProtectPdfClient } from "./protect-client";

export const metadata: Metadata = {
  title: "Protect PDF — Password Protect PDF Online | Varolline Docs",
  description: "Encrypt your PDF with a password to prevent unauthorized access.",
};

export default function ProtectPdfPage() {
  return <ProtectPdfClient />;
}
