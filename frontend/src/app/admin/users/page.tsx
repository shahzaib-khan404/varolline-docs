import type { Metadata } from "next";
import { AdminUsersView } from "@/components/features/admin/admin-users-view";

export const metadata: Metadata = {
  title: "User Management — Admin Portal | uLovepdf",
  description: "Live user accounts, authentication methods, role assignments, and processing workload",
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
