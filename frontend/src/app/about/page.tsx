import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Zap, Shield, Clock, Globe } from "lucide-react";

export const metadata: Metadata = { title: "About — Varolline Docs" };

const VALUES = [
  { icon: Zap,    title: "Fast",    desc: "Files are processed in seconds using distributed workers." },
  { icon: Shield, title: "Private", desc: "All uploads are encrypted and auto-deleted after 1 hour." },
  { icon: Clock,  title: "Free",    desc: "Every tool is free to use with no account required." },
  { icon: Globe,  title: "Open",    desc: "Built on open standards — no vendor lock-in." },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="mb-12 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">About Varolline Docs</h1>
      </div>

      <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
        Varolline Docs is a free, browser-based document processing platform. We built it
        because working with PDFs and documents should be simple — no installs, no subscriptions,
        no privacy concerns.
      </p>

      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mb-1 font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Try the tools
        </Link>
        <Link
          href="/auth/register"
          className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          Create free account
        </Link>
      </div>
    </main>
  );
}
