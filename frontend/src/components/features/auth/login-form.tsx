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
  const { setTokens, setUser, accessToken } = useAuthStore();

  // If a valid session already exists, go straight to dashboard
  useEffect(() => {
    if (accessToken) {
      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.replace(redirect);
    }
  }, [accessToken, router, searchParams]);

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
      const user = await authApi.me();
      setUser(user);

      toast({ title: "Welcome back!", description: `Logged in as ${user.email}` });

      const redirect = searchParams.get("redirect") ?? "/dashboard";
      // replace so the login page is removed from history — back button won't return here
      router.replace(redirect);
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
