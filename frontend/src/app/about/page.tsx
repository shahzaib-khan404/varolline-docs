import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Zap, Shield, Clock, Globe } from "lucide-react";

export const metadata: Metadata = { title: "About" };

const VALUES = [
  { icon: Zap,    title: "Fast",    desc: "Files are processed in seconds using distributed workers." },
  { icon: Shield, title: "Private", desc: "All uploads are encrypted and auto-deleted after 1 hour." },
  { icon: Clock,  title: "Free",    desc: "Every tool is free to use with no account required." },
  { icon: Globe,  title: "Open",    desc: "Built on open standards — no vendor lock-in." },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-none bg-sky-600 text-white">
          <FileText className="h-5 w-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">About uLovepdf</h1>
      </div>

      <p className="mb-8 text-base text-muted-foreground leading-relaxed">
        uLovepdf is a free, browser-based document processing platform. We built it
        because working with PDFs and documents should be simple — no installs, no subscriptions,
        no privacy concerns.
      </p>

      <div className="mb-10 grid gap-3.5 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-none border border-border/80 bg-card/60 backdrop-blur-md p-4">
            <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-none bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 text-xs font-semibold transition-colors min-h-[44px] flex items-center"
        >
          Try the tools
        </Link>
        <Link
          href="/auth/register"
          className="rounded-none border border-border bg-card/60 hover:bg-muted text-foreground px-5 py-2.5 text-xs font-semibold transition-colors min-h-[44px] flex items-center"
        >
          Create free account
        </Link>
      </div>
    </main>
  );
}
