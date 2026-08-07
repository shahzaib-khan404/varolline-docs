import type { Metadata } from "next";
import { HistoryPageClient } from "./history-client";
import { DashboardHeader } from "@/components/layouts/dashboard-header";

export const metadata: Metadata = { title: "Job History — Varolline Docs" };

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Job history" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
          <HistoryPageClient />
        </div>
      </main>
    </div>
  );
}
