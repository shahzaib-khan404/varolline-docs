import type { Metadata } from "next";
import { AdminToolsView } from "@/components/features/admin/admin-tools-view";

export const metadata: Metadata = {
  title: "Tools & Engine Console — Admin Portal | uLovepdf",
  description: "Platform tools inventory, conversion engine health, live database executions, and test launch",
};

export default function AdminToolsPage() {
  return <AdminToolsView />;
}
