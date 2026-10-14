import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layouts/dashboard-header";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = { title: "Profile — uLovepdf" };

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Profile" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-4 sm:p-6">
          <ProfileClient />
        </div>
      </main>
    </div>
  );
}
