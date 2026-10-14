import type { Metadata } from "next";
import { OrganizePdfClient } from "./organize-client";

export const metadata: Metadata = {
  title: "Organize PDF — Reorder, Rotate & Delete Pages | uLovepdf",
  description:
    "Organize and sort pages of your PDF file however you like. Reorder pages, remove unwanted pages, and rotate with precision.",
};

export default function OrganizePdfPage() {
  return <OrganizePdfClient />;
}
