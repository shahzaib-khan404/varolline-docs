import { DashboardSidebar } from "@/components/layouts/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <DashboardSidebar className="hidden md:flex" />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
