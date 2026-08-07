"use client";

import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/layouts/tool-layout";
import { TOOL_BY_ID } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { FileRead } from "@/types/api";

function PasswordInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string | null;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className={cn(
            "h-9 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none",
            "focus:ring-1 focus:ring-ring",
            error ? "border-destructive focus:ring-destructive" : ""
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function strengthLabel(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: "", color: "bg-muted", width: "w-0" };
  if (pw.length < 6) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  const has = (re: RegExp) => re.test(pw);
  const score =
    (has(/[A-Z]/) ? 1 : 0) +
    (has(/[0-9]/) ? 1 : 0) +
    (has(/[^A-Za-z0-9]/) ? 1 : 0) +
    (pw.length >= 12 ? 1 : 0);
  if (score <= 1) return { label: "Fair", color: "bg-amber-500", width: "w-2/4" };
  if (score <= 2) return { label: "Good", color: "bg-yellow-400", width: "w-3/4" };
  return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
}

export function ProtectPdfClient() {
  const tool = TOOL_BY_ID["password_protect"];

  const [userPw, setUserPw] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [showOwner, setShowOwner] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);

  const [userError, setUserError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  const strength = strengthLabel(userPw);

  const validateUserPw = (v: string) => {
    if (!v.trim()) return "Password is required.";
    if (v.length < 4) return "Password must be at least 4 characters.";
    return null;
  };

  const getJobOptions = useCallback(
    (files: FileRead[]) => {
      const uErr = validateUserPw(userPw);
      if (uErr) throw new Error(uErr);
      if (showOwner && ownerPw && ownerPw.length < 4)
        throw new Error("Owner password must be at least 4 characters.");

      return {
        input_file_id: files[0]!.id,
        options: {
          user_password: userPw,
          ...(showOwner && ownerPw ? { owner_password: ownerPw } : {}),
          allow_printing: allowPrinting,
          allow_copying: allowCopying,
        },
      };
    },
    [userPw, ownerPw, showOwner, allowPrinting, allowCopying]
  );

  return (
    <ToolLayout tool={tool} getJobOptions={getJobOptions} actionLabel="Protect PDF">
      <div className="space-y-5">
        {/* Open password */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Open password
            </label>
          </div>
          <PasswordInput
            value={userPw}
            onChange={(v) => {
              setUserPw(v);
              setUserError(validateUserPw(v));
            }}
            placeholder="Password to open the PDF"
            error={userError}
          />
          {/* Strength meter */}
          {userPw && (
            <div className="space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all", strength.color, strength.width)} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Strength: <span className="font-medium">{strength.label}</span>
              </p>
            </div>
          )}
        </div>

        {/* Owner password toggle */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowOwner((s) => !s)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showOwner ? "− Remove owner password" : "+ Set owner password (optional)"}
          </button>
          {showOwner && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                The owner password grants full control — editing, printing, and copying — even if
                those are restricted for regular users.
              </p>
              <PasswordInput
                value={ownerPw}
                onChange={(v) => {
                  setOwnerPw(v);
                  setOwnerError(v.length > 0 && v.length < 4 ? "At least 4 characters." : null);
                }}
                placeholder="Owner password (optional)"
                error={ownerError}
              />
            </div>
          )}
        </div>

        {/* Permissions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Permissions for viewers
          </p>
          <div className="space-y-2">
            {[
              {
                id: "printing",
                label: "Allow printing",
                hint: "Viewers can print the document.",
                value: allowPrinting,
                set: setAllowPrinting,
              },
              {
                id: "copying",
                label: "Allow text & image copying",
                hint: "Viewers can copy content from the document.",
                value: allowCopying,
                set: setAllowCopying,
              },
            ].map((perm) => (
              <label
                key={perm.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={perm.value}
                  onChange={(e) => perm.set(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div>
                  <p className="text-xs font-semibold">{perm.label}</p>
                  <p className="text-[10px] text-muted-foreground">{perm.hint}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Encrypted with AES-256. Keep your password safe — there is no recovery option.
        </p>
      </div>
    </ToolLayout>
  );
}
