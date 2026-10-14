"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface JwtPayload {
  sub?: string;
  role?: string;
  email?: string;
  exp?: number;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, setUser, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const checkingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || checkingRef.current) return;

    // Check store first, then localStorage, then document.cookie
    let token: string | null = accessToken;
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("access_token");
      if (!token) {
        const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
        if (match && match[1]) token = match[1];
      }
    }

    if (!token) {
      window.location.href = "/auth/login?redirect=/admin";
      return;
    }

    // Fast-path inspection of the JWT (instant, 0ms)
    const jwt = parseJwt(token);
    if (jwt) {
      // Check expiration
      if (jwt.exp && jwt.exp * 1000 < Date.now()) {
        logout();
        window.location.href = "/auth/login?redirect=/admin";
        return;
      }

      // Check role directly from signed JWT
      if (jwt.role && jwt.role !== "admin") {
        setDeniedEmail(jwt.email || "user");
        setAuthorized(false);
        router.replace("/dashboard");
        return;
      }

      if (jwt.role === "admin") {
        setAuthorized(true);
      }
    }

    // If store already has user
    if (user) {
      if (user.role === "admin") {
        setAuthorized(true);
        return;
      } else {
        setDeniedEmail(user.email);
        setAuthorized(false);
        router.replace("/dashboard");
        return;
      }
    }

    // Fetch user profile from API to ensure store is hydrated
    checkingRef.current = true;
    authApi
      .me()
      .then((me) => {
        setUser(me);
        if (me.role === "admin") {
          setAuthorized(true);
        } else {
          setDeniedEmail(me.email);
          setAuthorized(false);
          router.replace("/dashboard");
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          logout();
          window.location.href = "/auth/login?redirect=/admin";
        } else if (jwt?.role === "admin") {
          setAuthorized(true);
        } else {
          window.location.href = "/auth/login?redirect=/admin";
        }
      });
  }, [mounted, accessToken, user, router, setUser, logout]);

  // While mounting or verifying
  if (!mounted || authorized === null) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Verifying administrator authorization…</p>
      </div>
    );
  }

  // Not an admin
  if (authorized === false) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Administrator Access Required</h2>
          <p className="max-w-md text-xs text-muted-foreground">
            This area is restricted to uLovePDF platform administrators. Your account ({deniedEmail ?? "user"}) does not have administrative privileges.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard">Return to User Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
