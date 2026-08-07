"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, LogOut, User, Settings, Bell, Menu, X,
  LayoutDashboard, History, FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ToolIcon } from "@/components/ui/tool-icon";
import { cn } from "@/lib/utils/cn";
import { TOOLS } from "@/config/tools";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";

function initials(name: string | null | undefined, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const NAV_MAIN = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History",   href: "/history",   icon: History },
  { label: "Profile",   href: "/profile",   icon: User },
  { label: "Settings",  href: "/settings",  icon: Settings },
];

export function DashboardHeader({ title }: { title?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    logout();
    document.cookie = "auth_token=; path=/; max-age=0";
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        {/* Mobile hamburger + page title */}
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          {title && <h1 className="text-sm font-semibold">{title}</h1>}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name ?? ""} />
                  <AvatarFallback className="text-[10px]">
                    {user ? initials(user.full_name, user.email) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-xs font-medium sm:block">
                  {user?.full_name ?? user?.email ?? "Account"}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-card border-r shadow-xl md:hidden"
            >
              {/* Drawer header */}
              <div className="flex h-14 items-center justify-between border-b px-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-semibold"
                  onClick={() => setDrawerOpen(false)}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                    <FileText className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm">Varolline Docs</span>
                </Link>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="space-y-0.5 px-2 py-3">
                {NAV_MAIN.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}

                <Separator className="my-2" />
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tools
                </p>

                {TOOLS.map((tool) => {
                  const active = pathname === tool.route;
                  return (
                    <Link
                      key={tool.id}
                      href={tool.route}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-white", tool.color)}>
                        <ToolIcon name={tool.icon} className="h-3 w-3" />
                      </span>
                      {tool.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Sign out at bottom */}
              <div className="border-t p-3">
                <button
                  onClick={() => { setDrawerOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
