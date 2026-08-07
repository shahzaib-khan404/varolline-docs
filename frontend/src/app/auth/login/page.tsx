import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/components/features/auth/login-form";
import { OAuthButtons } from "@/components/features/auth/oauth-buttons";
import { RegisteredBanner } from "@/components/features/auth/registered-banner";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Varolline Docs account.",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Success banner after registration */}
      <Suspense fallback={null}>
        <RegisteredBanner />
      </Suspense>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one free
          </Link>
        </p>
      </div>

      {/* OAuth */}
      <OAuthButtons />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <Separator className="flex-1" />
      </div>

      {/* Email form */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      {/* Forgot password */}
      <p className="text-center text-xs text-muted-foreground">
        <Link
          href="/auth/forgot-password"
          className="underline-offset-4 hover:underline"
        >
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
