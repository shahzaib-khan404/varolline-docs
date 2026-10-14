import type { Metadata } from "next";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { RegisterForm } from "@/components/features/auth/register-form";
import { OAuthButtons } from "@/components/features/auth/oauth-buttons";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free uLovepdf account.",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
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
      <RegisterForm />
    </div>
  );
}
