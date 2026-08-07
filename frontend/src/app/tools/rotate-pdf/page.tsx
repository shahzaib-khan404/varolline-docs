import type { Metadata } from "next";
import { RotatePdfClient } from "./rotate-client";

export const metadata: Metadata = {
  title: "Rotate PDF — Fix PDF Orientation Online | Varolline Docs",
  description: "Rotate all pages or specific pages of your PDF to the correct orientation.",
};

export default function RotatePdfPage() {
  return <RotatePdfClient />;
}
