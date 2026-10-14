"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { KeyRound, ShieldAlert, Eye, EyeOff } from "lucide-react";
import type { FileRead } from "@/types/api";

export function UnlockPdfClient() {
  const tool = TOOL_BY_ID["unlock_pdf"];
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      return {
        input_file_id: files[0]!.id,
        options: {
          password: password.trim(),
        },
      };
    },
    [password]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Unlock PDF">
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Decryption & Permission Reset</p>
            <p>
              If your PDF is encrypted with an open password, enter it below. If your PDF only has editing or printing restrictions, leave the password blank and we will remove the restrictions automatically.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Document Password (optional)</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password if required to open..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 pr-10 text-sm font-medium transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
