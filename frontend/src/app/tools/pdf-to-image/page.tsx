import type { Metadata } from "next";
import { PdfToImageClient } from "./pdf-to-image-client";

export const metadata: Metadata = {
  title: "PDF to Image — Convert PDF Pages to PNG or JPG | uLovepdf",
  description:
    "Convert every page of a PDF to PNG or JPG images. Choose resolution from 72 to 300 dpi. All pages bundled in a ZIP.",
};

export default function PdfToImagePage() {
  return <PdfToImageClient />;
}
