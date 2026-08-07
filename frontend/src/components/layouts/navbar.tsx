"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sun, Moon, Menu, X, ChevronDown,
  LayoutDashboard, LogOut, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/ui/tool-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { TOOL_CATEGORIES } from "@/config/tools";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const { user, accessToken, logout } = useAuthStore();
  const isAuthenticated = Boolean(accessToken);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = () => {
    authApi.logout();
    logout();
    router.push("/");
    router.refresh();
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Account";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm tracking-tight">Varolline Docs</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Tools mega-menu */}
          <div className="relative" onMouseLeave={() => setToolsOpen(false)}>
            <button
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onMouseEnter={() => setToolsOpen(true)}
            >
              Tools
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", toolsOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full mt-1 w-[520px] -translate-x-1/2 rounded-xl border bg-popover p-4 shadow-xl"
                  onMouseEnter={() => setToolsOpen(true)}
                >
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(TOOL_CATEGORIES).map(([cat, tools]) => (
                      <div key={cat} className="space-y-0.5">
                        <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {cat}
                        </p>
                        {tools.map((tool) => (
                          <Link
                            key={tool.id}
                            href={tool.route}
                            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                            onClick={() => setToolsOpen(false)}
                          >
                            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white", tool.color)}>
                              <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />
                            </span>
                            {tool.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Desktop auth */}
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-background transition-opacity hover:opacity-90">
                      {user?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar_url} alt={displayName} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        initials
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium">{displayName}</p>
                      {user?.email && (
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-3.5 w-3.5" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">Get started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b bg-background md:hidden"
          >
            <div className="space-y-1 px-4 pb-4 pt-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Tools
              </p>
              {Object.values(TOOL_CATEGORIES).flat().map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.route}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white", tool.color)}>
                    <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />
                  </span>
                  {tool.name}
                </Link>
              ))}
              <div className="mt-3 space-y-1 border-t pt-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {initials}
                      </div>
                      <span className="text-sm font-medium">{displayName}</span>
                    </div>
                    <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="destructive" onClick={() => { setMobileOpen(false); handleSignOut(); }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/auth/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/auth/register" onClick={() => setMobileOpen(false)}>Get started free</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
