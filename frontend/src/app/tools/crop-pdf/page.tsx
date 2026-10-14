import type { Metadata } from "next";
import { CropPdfClient } from "./crop-client";

export const metadata: Metadata = {
  title: "Crop PDF — Trim Margins & Adjust Viewport | uLovepdf",
  description:
    "Trim PDF margins and customize visible page area with precision. Crop all pages or specific page ranges.",
};

export default function CropPdfPage() {
  return <CropPdfClient />;
}
