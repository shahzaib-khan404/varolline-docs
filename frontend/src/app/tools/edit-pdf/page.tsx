import type { Metadata } from "next";
import { EditPdfClient } from "./edit-client";

export const metadata: Metadata = {
  title: "Edit PDF — Add Text, Annotations & Shapes Online | uLovepdf",
  description:
    "Edit PDF files online for free. Add custom text, callouts, highlights, and annotations directly onto your PDF pages with ease.",
};

export default function EditPdfPage() {
  return <EditPdfClient />;
}
