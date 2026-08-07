"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function RegisteredBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("registered") !== "true") return null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Account created successfully!</p>
        <p className="text-xs opacity-80">Sign in below to get started.</p>
      </div>
    </div>
  );
}
