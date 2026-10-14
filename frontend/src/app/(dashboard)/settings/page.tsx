import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layouts/dashboard-header";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings — uLovepdf" };

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Settings" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-4 sm:p-6">
          <SettingsClient />
        </div>
      </main>
    </div>
  );
}
