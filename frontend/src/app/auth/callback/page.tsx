"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import { toast } from "@/hooks/use-toast";

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  github_denied: "GitHub sign-in was cancelled.",
  invalid_state: "Authentication session expired. Please try again.",
  token_exchange_failed: "Failed to complete sign-in. Please try again.",
  no_email: "Could not retrieve your email address from the provider.",
};

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign-in failed",
        description: ERROR_MESSAGES[error] ?? "An unexpected error occurred.",
      });
      router.replace("/auth/login");
      return;
    }

    if (!accessToken || !refreshToken) {
      toast({
        variant: "destructive",
        title: "Sign-in failed",
        description: "No tokens received from the server.",
      });
      router.replace("/auth/login");
      return;
    }

    const finalize = async () => {
      setTokens(accessToken, refreshToken);
      document.cookie = `auth_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;

      try {
        const user = await authApi.me();
        setUser(user);
        toast({ title: "Welcome!", description: `Signed in as ${user.email}` });
        router.replace("/dashboard");
        router.refresh();
      } catch {
        toast({
          variant: "destructive",
          title: "Sign-in failed",
          description: "Could not load your profile. Please try again.",
        });
        router.replace("/auth/login");
      }
    };

    finalize();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign-in…</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
