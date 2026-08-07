"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Eye, EyeOff, Loader2, Moon, Sun, Monitor, ShieldCheck, Trash2 } from "lucide-react";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLogout } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type PasswordForm = z.infer<typeof changePasswordSchema>;

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark",  label: "Dark",  icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all",
            theme === value
              ? "border-primary bg-primary/5 font-medium"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function ChangePasswordForm() {
  const [show, setShow] = useState<{ current: boolean; next: boolean }>({ current: false, next: false });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<PasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = async (values: PasswordForm) => {
    setSaving(true);
    try {
      await apiClient.post("/users/me/change-password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      form.reset();
      toast({ title: "Password changed", description: "Your new password is active." });
    } catch (err: any) {
      const msg = (err as Error)?.message ?? "Current password is incorrect.";
      form.setError("current_password", { message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="current_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={show.current ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={show.next ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 digit"
                    {...field}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {show.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="sm" disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</>
          ) : (
            <><ShieldCheck className="mr-2 h-4 w-4" />Update password</>
          )}
        </Button>
      </form>
    </Form>
  );
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const logout = useLogout();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete("/users/me");
      logout();
      document.cookie = "auth_token=; path=/; max-age=0";
      router.push("/");
    } catch {
      toast({ title: "Error", description: "Could not delete account. Contact support.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Deleting your account is permanent. All your files and jobs will be removed.
      </p>
      {!confirming ? (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete my account
        </Button>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">Are you sure? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete permanently
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsClient() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
          <CardDescription className="text-xs">Choose your preferred theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Security</CardTitle>
          <CardDescription className="text-xs">Change your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-destructive">Danger zone</CardTitle>
          <CardDescription className="text-xs">Irreversible account actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <DangerZone />
        </CardContent>
      </Card>
    </motion.div>
  );
}
