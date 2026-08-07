import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password — Varolline Docs" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
