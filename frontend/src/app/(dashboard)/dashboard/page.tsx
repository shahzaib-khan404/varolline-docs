import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layouts/dashboard-header";
import { StatsCards } from "@/components/features/dashboard/stats-cards";
import { RecentJobs } from "@/components/features/dashboard/recent-jobs";
import { QuickTools } from "@/components/features/dashboard/quick-tools";

export const metadata: Metadata = { title: "Dashboard — uLovepdf" };

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Dashboard" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
          {/* Stats row */}
          <StatsCards />

          {/* Jobs table + quick tools side-by-side on large screens */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentJobs />
            </div>
            <div>
              <QuickTools />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
