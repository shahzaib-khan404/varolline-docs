import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Zap, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: {
    template: "%s | Varolline Docs",
    default: "Sign in | Varolline Docs",
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
      {/* ── Left panel — decorative ─────────────────────────── */}
      <div className="relative hidden flex-col justify-between bg-muted/30 p-10 lg:flex">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm">Varolline Docs</span>
        </Link>

        {/* Feature highlights */}
        <div className="relative space-y-6">
          <blockquote className="space-y-3">
            <p className="text-2xl font-bold tracking-tight leading-snug">
              Process any document.
              <br />
              <span className="text-muted-foreground font-normal">
                Fast, free, and beautifully simple.
              </span>
            </p>
          </blockquote>
          <ul className="space-y-3">
            {FEATURE_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} Varolline Docs — MIT licensed open source
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
          <span className="text-sm">Varolline Docs</span>
        </Link>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
