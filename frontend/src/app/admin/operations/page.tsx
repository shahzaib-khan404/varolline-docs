import type { Metadata } from "next";
import { AdminOperationsView } from "@/components/features/admin/admin-operations-view";

export const metadata: Metadata = {
  title: "Operations Dashboard — Admin Portal | uLovepdf",
  description: "Live platform-wide operations monitoring, conversion queues, and job management",
};

export default function AdminOperationsPage() {
  return <AdminOperationsView />;
}
