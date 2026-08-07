import type { Metadata } from "next";
import { DeletePagesClient } from "./delete-client";

export const metadata: Metadata = {
  title: "Delete PDF Pages — Remove Pages from PDF | Varolline Docs",
  description: "Remove specific pages from your PDF document easily and for free.",
};

export default function DeletePagesPage() {
  return <DeletePagesClient />;
}
