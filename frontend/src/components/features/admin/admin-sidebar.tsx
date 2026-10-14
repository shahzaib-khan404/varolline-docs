"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Megaphone,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";

const NAV_ITEMS = [
  {
    title: "Traffic & Analytics",
    href: "/admin",
    icon: BarChart3,
    exact: true,
    badge: "Live",
  },
  {
    title: "Operations Dashboard",
    href: "/admin/operations",
    icon: LayoutDashboard,
    exact: false,
    badge: "Platform",
  },
  {
    title: "User Panel",
    href: "/admin/users",
    icon: Users,
    exact: false,
    badge: "Real Users",
  },
  {
    title: "All Tools",
    href: "/admin/tools",
    icon: Wrench,
    exact: false,
    badge: "12 Tools",
  },
  {
    title: "AdSense & Ad Slots",
    href: "/admin/ads",
    icon: Megaphone,
    exact: false,
    badge: "Slots 1-7",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleSignOut = () => {
    authApi.logout();
    logout();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border/70 bg-card/60 flex flex-col justify-between p-4 backdrop-blur-md h-screen overflow-y-auto">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground">Admin Portal</div>
            <div className="text-[11px] text-muted-foreground">Traffic & Ad Engine</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-mono",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Admin profile + Return button */}
      <div className="space-y-3 pt-4 border-t border-border/60">
        {/* Admin profile card */}
        <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                AD
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-foreground">
                  {user?.full_name || "Admin"}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {user?.email || "saeedmian074@gmail.com"}
                </div>
              </div>
            </div>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase">
              Admin
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Main Website</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
