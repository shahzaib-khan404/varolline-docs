import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Zap, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: {
    template: "%s | uLovepdf",
    default: "Sign in | uLovepdf",
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
      {/* ── Left panel — decorative with hardware-accelerated video ──── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-background p-10 lg:flex border-r border-border/40">
        {/* ── High-Definition Ambient Backdrop Image ── */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden isolate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/signin.jpg"
            alt="uLovepdf Security & Processing"
            className="absolute inset-0 h-full w-full object-cover opacity-65 dark:opacity-75 transition-opacity duration-700 scale-[1.02]"
          />

          {/* Cyber Tech Grid Overlay */}
          <div className="bg-grid-pattern absolute inset-0 opacity-[0.2] dark:opacity-[0.1]" />

          {/* Soft Vignette & Readability Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/50 to-background/95" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_90%)] opacity-75" />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 font-bold group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform duration-300">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-base tracking-tight text-foreground font-extrabold">uLovepdf</span>
        </Link>

        {/* Feature highlights with glassmorphic cards */}
        <div className="relative z-10 space-y-7">
          <blockquote className="space-y-3">
            <p className="text-3xl font-black tracking-tight leading-snug text-foreground">
              Process any document.
              <br />
              <span className="gradient-text font-extrabold">
                Fast, free, and beautifully simple.
              </span>
            </p>
          </blockquote>
          <ul className="space-y-3">
            {FEATURE_POINTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3.5 rounded-2xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-card/50 p-3.5 text-sm font-semibold backdrop-blur-xl shadow-sm text-foreground"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-400/25">
                  <Icon className="h-4 w-4" />
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm">uLovepdf</span>
        </Link>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
