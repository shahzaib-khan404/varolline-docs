"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
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
import { registerSchema, type RegisterValues } from "@/lib/validations/auth";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils/cn";
import type { ApiError } from "@/lib/api/client";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}
          >
            {ok ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { accessToken } = useAuthStore();

  // Already logged in — skip straight to dashboard
  useEffect(() => {
    if (accessToken) router.replace("/dashboard");
  }, [accessToken, router]);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting, errors } = form.formState;
  const passwordValue = form.watch("password");

  async function onSubmit(values: RegisterValues) {
    try {
      await authApi.register({
        email: values.email,
        password: values.password,
        full_name: values.full_name || undefined,
      });
      // Replace register in history so back button never returns here
      router.replace("/auth/login?registered=true");
    } catch (err) {
      const msg =
        (err as ApiError).message ?? "Registration failed. Please try again.";
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
          {errors.root && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Full name{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane Smith"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      autoComplete="new-password"
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
                <PasswordStrength password={passwordValue} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...field}
                  />
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </form>
      </Form>
    </motion.div>
  );
}
