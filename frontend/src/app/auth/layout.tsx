import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Zap, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: {
    template: "%s | uLovepdf",
    default: "Sign in",
  },
};

const FEATURE_POINTS = [
  { icon: Zap, text: "12 free tools, no limits" },
  { icon: Shield, text: "SSL encrypted, files auto-deleted" },
  { icon: Clock, text: "Results in seconds" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left panel ──── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-background p-10 lg:flex border-r border-border/40">
        {/* Ambient Backdrop Image */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden isolate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/signin.jpg"
            alt="uLovepdf Security & Processing"
            className="absolute inset-0 h-full w-full object-cover opacity-70 dark:opacity-55 transition-opacity duration-500 scale-[1.01]"
          />

          {/* Cyber Tech Grid Overlay */}
          <div className="bg-grid-pattern absolute inset-0 opacity-30 dark:opacity-15" />

          {/* Solid Readability Overlay */}
          <div className="absolute inset-0 bg-background/40 dark:bg-background/65" />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 font-bold group">
          <div className="flex h-8 w-8 items-center justify-center rounded-none bg-sky-600 text-white transition-opacity group-hover:opacity-90">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-base tracking-tight text-foreground font-extrabold">uLovepdf</span>
        </Link>

        {/* Feature highlights with clean glass cards */}
        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-2">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug text-foreground">
              Process any document.
              <br />
              <span className="text-sky-600 dark:text-sky-400">
                Fast, free, and beautifully simple.
              </span>
            </p>
          </blockquote>
          <ul className="space-y-2.5">
            {FEATURE_POINTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-none border border-border/80 bg-card/60 backdrop-blur-md p-3 text-xs font-semibold text-foreground shadow-xs"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs font-medium text-muted-foreground">
          © {new Date().getFullYear()} uLovepdf — MIT licensed open source
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        {/* Mobile logo */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 font-semibold lg:hidden"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-none bg-sky-600 text-white">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold">uLovepdf</span>
        </Link>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
