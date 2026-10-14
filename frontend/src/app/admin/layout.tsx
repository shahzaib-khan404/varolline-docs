import { AdminSidebar } from "@/components/features/admin/admin-sidebar";
import { AdminGuard } from "@/components/features/admin/admin-guard";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata = {
  title: "Admin Portal — Management & Traffic Analytics | uLovepdf",
  description: "Company Product Marketing, Ad Slots & Live Traffic Analytics Portal",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Main Administrative Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Admin Header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground">
                uLovePDF Management & Traffic Analytics Portal
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <span>View Live Website</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </header>

          {/* Scrollable View */}
          <main className="flex-1 overflow-y-auto scroll-smooth p-6 lg:p-8">
            <div className="mx-auto max-w-7xl pb-16">{children}</div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
