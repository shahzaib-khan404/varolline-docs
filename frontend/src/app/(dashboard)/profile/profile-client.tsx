"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api/client";
import { formatDate } from "@/lib/utils/format";
import type { UserRead } from "@/types/api";

const profileSchema = z.object({
  full_name: z.string().max(100).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

function initials(name: string | null | undefined, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function ProfileClient() {
  const { data: user, isLoading, refetch } = useCurrentUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { full_name: user?.full_name ?? "" },
  });

  const onSubmit = async (values: ProfileForm) => {
    setSaving(true);
    try {
      await apiClient.patch("/users/me", values);
      await refetch();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Avatar + identity card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Account</CardTitle>
          <CardDescription className="text-xs">Your identity and plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16 text-xl">
            <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? ""} />
            <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{user.full_name ?? "(no name set)"}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={user.is_verified ? "success" : "secondary"}>
                {user.is_verified ? "Verified" : "Unverified"}
              </Badge>
              <Badge variant="outline" className="capitalize">{user.role}</Badge>
              <span className="text-xs text-muted-foreground self-center">
                Joined {formatDate(user.created_at)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Edit profile</CardTitle>
          <CardDescription className="text-xs">Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email — read-only */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input value={user.email} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed after registration.
                </p>
              </div>

              <Button type="submit" disabled={saving} size="sm">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Save changes</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
