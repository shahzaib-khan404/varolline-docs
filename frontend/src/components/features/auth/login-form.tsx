"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authApi } from "@/lib/api/auth";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/hooks/use-toast";
import type { ApiError } from "@/lib/api/client";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser, accessToken, user } = useAuthStore();

  // If a valid session already exists, route based on role
  useEffect(() => {
    if (accessToken && user) {
      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        if (redirect.startsWith("/admin") && user.role !== "admin") {
          router.replace("/");
        } else {
          router.replace(redirect);
        }
      } else {
        router.replace(user.role === "admin" ? "/admin" : "/");
      }
    }
  }, [accessToken, user, router, searchParams]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: LoginValues) {
    try {
      const tokens = await authApi.login(values);
      setTokens(tokens.access_token, tokens.refresh_token);

      // Set middleware cookie
      document.cookie = `auth_token=${tokens.access_token}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;

      // Fetch and store user
      const loggedInUser = await authApi.me();
      setUser(loggedInUser);

      toast({ title: "Welcome back!", description: `Logged in as ${loggedInUser.email}` });

      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        if (redirect.startsWith("/admin") && loggedInUser.role !== "admin") {
          router.replace("/");
        } else {
          router.replace(redirect);
        }
      } else if (loggedInUser.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
      router.refresh();
    } catch (err) {
      const msg =
        (err as ApiError).message ?? "Login failed. Please try again.";
      form.setError("root", { message: msg });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Root error */}
          {form.formState.errors.root && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
}
