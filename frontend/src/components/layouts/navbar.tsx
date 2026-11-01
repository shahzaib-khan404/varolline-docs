"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sun, Moon, Menu, X, ChevronDown,
  LogOut, User, ShieldCheck, Settings, History,
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
import { TOOL_CATEGORIES, TOOLS } from "@/config/tools";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import { useCurrentUser } from "@/hooks/use-auth";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "About", href: "/about" },
];

const CATEGORY_META = [
  { id: "pdf", label: "PDF Tools", tools: TOOL_CATEGORIES.pdf },
  { id: "convert", label: "Convert", tools: TOOL_CATEGORIES.convert },
  { id: "organize", label: "Organize & Edit", tools: TOOL_CATEGORIES.organize },
  { id: "protect", label: "Security", tools: TOOL_CATEGORIES.protect },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const { user: storeUser, accessToken, logout } = useAuthStore();
  const { data: queryUser } = useCurrentUser();
  const user = storeUser || queryUser;
  const isAuthenticated = Boolean(accessToken || user);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = () => {
    authApi.logout();
    logout();
    document.cookie = "auth_token=; path=/; max-age=0";
    router.push("/");
    router.refresh();
  };

  const displayName: string = user?.full_name || (user?.email ? (user.email.split("@")[0] || "Account") : "Account");
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-200 px-4 sm:px-6 lg:px-8",
        scrolled ? "pt-2" : "pt-3"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 rounded-none transition-all duration-200 border",
          scrolled
            ? "border-border/80 bg-background/85 backdrop-blur-xl shadow-xs"
            : "border-border/50 bg-background/60 backdrop-blur-md"
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight group">
          <div className="flex h-8 w-8 items-center justify-center rounded-none bg-sky-600 text-white transition-opacity group-hover:opacity-90">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
            uLove<span className="text-sky-600 dark:text-sky-400">pdf</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Tools mega-menu */}
          <div className="relative" onMouseLeave={() => setToolsOpen(false)}>
            <button
              className="flex items-center gap-1 rounded-none px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onMouseEnter={() => setToolsOpen(true)}
            >
              Tools
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", toolsOpen && "rotate-180")} />
            </button>

            {/* Mega menu panel */}
            <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[720px] rounded-none border border-border bg-popover/95 p-6 backdrop-blur-xl shadow-md"
                  onMouseEnter={() => setToolsOpen(true)}
                  onMouseLeave={() => setToolsOpen(false)}
                >
                  <div className="grid grid-cols-4 gap-6">
                    {CATEGORY_META.map((cat) => (
                      <div key={cat.id}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {cat.label}
                        </p>
                        <div className="space-y-1">
                          {cat.tools.map((tool) => (
                            <Link
                              key={tool.id}
                              href={tool.route}
                              className="flex items-center gap-2 rounded-none px-2 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              onClick={() => setToolsOpen(false)}
                            >
                              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-none text-white", tool.color)}>
                                <ToolIcon name={tool.icon} className="h-3 w-3" />
                              </span>
                              <span className="truncate">{tool.name}</span>
                            </Link>
                          ))}
                        </div>
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
              className="rounded-none px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground border border-border/50"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* User menu or Auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-none border-border">
                    <div className="flex h-5 w-5 items-center justify-center rounded-none bg-sky-600 text-[10px] font-bold text-white">
                      {initials}
                    </div>
                    <span className="max-w-[100px] truncate text-xs">{displayName}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-none border-border">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 text-xs">
                      <User className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 text-xs font-semibold text-sky-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin Portal
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 text-xs">
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/history" className="flex items-center gap-2 text-xs">
                      <History className="h-3.5 w-3.5" />
                      History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive text-xs">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="rounded-none">
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="rounded-none bg-sky-600 hover:bg-sky-700 text-white">
                  <Link href="/auth/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-accent md:hidden border border-border/50"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border bg-background/95 backdrop-blur-2xl md:hidden mt-2 border border-border/80"
          >
            <div className="max-h-[80vh] overflow-y-auto px-4 py-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                All Tools
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.route}
                    className="flex items-center gap-2 rounded-none px-2.5 py-2 text-xs transition-colors hover:bg-accent min-h-[44px]"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-none text-white", tool.color)}>
                      <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{tool.name}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-none px-2.5 py-2 text-sm transition-colors hover:bg-accent min-h-[44px] flex items-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 pb-2">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-none bg-sky-600 text-xs font-semibold text-white">
                        {initials}
                      </div>
                      <span className="text-sm font-medium">{displayName}</span>
                    </div>
                    {user?.role === "admin" && (
                      <Button variant="secondary" asChild onClick={() => setMobileOpen(false)} className="rounded-none border border-sky-500/40 text-primary min-h-[44px]">
                        <Link href="/admin">
                          <ShieldCheck className="mr-2 h-4 w-4 text-sky-500" />
                          Admin Portal
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild onClick={() => setMobileOpen(false)} className="rounded-none min-h-[44px]">
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                      </Link>
                    </Button>
                    <Button variant="outline" asChild onClick={() => setMobileOpen(false)} className="rounded-none min-h-[44px]">
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button variant="outline" asChild onClick={() => setMobileOpen(false)} className="rounded-none min-h-[44px]">
                      <Link href="/history">
                        <History className="mr-2 h-4 w-4" />
                        History
                      </Link>
                    </Button>
                    <Button variant="destructive" onClick={() => { setMobileOpen(false); handleSignOut(); }} className="rounded-none min-h-[44px]">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="rounded-none min-h-[44px]">
                      <Link href="/auth/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                    </Button>
                    <Button asChild className="rounded-none bg-sky-600 hover:bg-sky-700 text-white min-h-[44px]">
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
