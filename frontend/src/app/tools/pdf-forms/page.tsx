import type { Metadata } from "next";
import { PdfFormsClient } from "./forms-client";

export const metadata: Metadata = {
  title: "PDF Forms — Fill Out & Flatten Interactive AcroForms Online | uLovepdf",
  description:
    "Fill interactive PDF forms, text inputs, checkboxes, and radio buttons online. Flatten forms into permanent, un-editable documents for distribution.",
};

export default function PdfFormsPage() {
  return <PdfFormsClient />;
}
