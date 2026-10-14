import type { Metadata } from "next";
import { UnlockPdfClient } from "./unlock-client";

export const metadata: Metadata = {
  title: "Unlock PDF — Remove PDF Password & Restrictions | uLovepdf",
  description:
    "Remove PDF password security and printing/copying restrictions instantly. Decrypt your documents securely.",
};

export default function UnlockPdfPage() {
  return <UnlockPdfClient />;
}
