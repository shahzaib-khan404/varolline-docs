"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  Mail,
  Calendar,
  Layers,
  Trash2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  adminUsersApi,
  type AdminUserItem,
  type AdminUsersResponse,
} from "@/lib/api/admin-users";
import { cn } from "@/lib/utils/cn";

export function AdminUsersView() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useQuery<AdminUsersResponse>({
    queryKey: ["admin-users", page, selectedRole, searchTerm],
    queryFn: () =>
      adminUsersApi.list({
        page,
        page_size: 20,
        role: selectedRole === "all" ? undefined : selectedRole,
        q: searchTerm.trim() || undefined,
      }),
    refetchInterval: 15000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "user" }) =>
      adminUsersApi.updateRole(userId, role),
    onSuccess: (_, vars) => {
      toast({
        title: "Role Updated",
        description: `User role changed to ${vars.role.toUpperCase()}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Cannot Update Role",
        description: err?.response?.data?.detail || "Operation failed.",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminUsersApi.updateStatus(userId, isActive),
    onSuccess: (_, vars) => {
      toast({
        title: "Status Updated",
        description: `User account ${vars.isActive ? "activated" : "deactivated"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Action Forbidden",
        description: err?.response?.data?.detail || "Failed to update status.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminUsersApi.delete(userId),
    onSuccess: () => {
      toast({
        title: "User Removed",
        description: "Account deleted from the database.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: err?.response?.data?.detail || "Could not delete user.",
      });
    },
  });

  const items = data?.items || [];
  const totalUsers = data?.total || 0;
  const adminCount = items.filter((u) => u.role === "admin").length;
  const regularCount = items.filter((u) => u.role === "user").length;
  const totalUserJobs = items.reduce((acc, u) => acc + (u.jobs_count || 0), 0);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              User Management & Accounts
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
              Live Database
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete database linking: manage registered user credentials, SSO providers, roles, and conversion workloads
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="self-start sm:self-auto gap-2 border-border/80 hover:bg-muted"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin text-primary")} />
          <span>Refresh Accounts</span>
        </Button>
      </div>

      {/* Aggregate User Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Registered Accounts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {totalUsers.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-500">Real DB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Verified & active user profiles</p>
        </div>

        {/* Admins */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Platform Admins</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {adminCount}
            </span>
            <span className="text-xs font-bold text-primary">Admin Access</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Includes primary administrator</p>
        </div>

        {/* Standard Users */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Standard Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {regularCount}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Normal Scope</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Client UI document processing</p>
        </div>

        {/* Total User Operations */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Linked Jobs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {totalUserJobs}
            </span>
            <span className="text-xs font-medium text-emerald-500">Processed</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Document operations by users</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by email or name…"
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { label: "All Users", value: "all" },
            { label: "Admins", value: "admin" },
            { label: "Standard Users", value: "user" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedRole(tab.value);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                selectedRole === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 font-semibold text-muted-foreground">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Auth Provider</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Conversions</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading registered users from database…</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">No users found</p>
                    <p className="text-[11px] mt-0.5">Try a different search query</p>
                  </td>
                </tr>
              ) : (
                items.map((user) => {
                  const isPrimaryAdmin = user.email === "saeedmian074@gmail.com";

                  return (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* User Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {user.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{user.full_name}</span>
                              {isPrimaryAdmin && (
                                <span className="rounded bg-sky-500/10 px-1 py-0.2 text-[9px] font-bold text-sky-500 border border-sky-500/20">
                                  Primary Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                          {user.provider}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            user.role === "admin"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {user.role === "admin" && <ShieldCheck className="h-2.5 w-2.5" />}
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                            user.is_active
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              user.is_active ? "bg-emerald-500" : "bg-destructive"
                            )}
                          />
                          {user.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      {/* Conversions count */}
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {user.jobs_count > 0 ? (
                          <span className="text-primary font-bold">{user.jobs_count} files</span>
                        ) : (
                          <span className="text-muted-foreground">0 files</span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Toggle Button (Disabled for primary admin) */}
                          {!isPrimaryAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                roleMutation.mutate({
                                  userId: user.id,
                                  role: user.role === "admin" ? "user" : "admin",
                                })
                              }
                              disabled={roleMutation.isPending}
                            >
                              <ShieldCheck className="h-3 w-3 text-sky-500" />
                              <span>{user.role === "admin" ? "Make User" : "Make Admin"}</span>
                            </Button>
                          )}

                          {/* Status Toggle Button */}
                          {!isPrimaryAdmin && !user.is_current_admin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 px-2 text-[11px] gap-1",
                                user.is_active ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"
                              )}
                              onClick={() =>
                                statusMutation.mutate({
                                  userId: user.id,
                                  isActive: !user.is_active,
                                })
                              }
                              disabled={statusMutation.isPending}
                            >
                              {user.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                              <span>{user.is_active ? "Deactivate" : "Activate"}</span>
                            </Button>
                          )}

                          {/* Delete Account */}
                          {!isPrimaryAdmin && !user.is_current_admin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete user ${user.email}?`)) {
                                  deleteMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {isPrimaryAdmin && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground italic px-2">
                              <Lock className="h-3 w-3" />
                              Protected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
