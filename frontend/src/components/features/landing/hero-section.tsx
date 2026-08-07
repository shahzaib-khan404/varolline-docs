"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/ui/tool-icon";
import { TOOLS } from "@/config/tools";
import { cn } from "@/lib/utils/cn";

const SHOWCASE_TOOLS = TOOLS.slice(0, 12);

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { ease: [0.25, 0.46, 0.45, 0.94], duration: 0.55 } },
};

export function HeroSection() {
  return (
    <section className="bg-white dark:bg-background pt-28 pb-16 sm:pt-32 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Headline block ────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            100% Free · No account required · Open source
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-[80px]"
          >
            Every PDF tool
            <br />
            <span className="text-primary">you'll ever need.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Merge, split, compress, convert, rotate, watermark and more.
            All free. No watermarks. Works on any browser.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 rounded-xl px-7 text-base font-semibold shadow-md shadow-primary/20"
              asChild
            >
              <Link href="/#tools">
                Browse all tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-7 text-base font-semibold"
              asChild
            >
              <Link href="/auth/register">Create free account</Link>
            </Button>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            {[
              { icon: ShieldCheck, label: "SSL encrypted" },
              { icon: Zap,         label: "Results in seconds" },
              { icon: Lock,        label: "Files auto-deleted" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 font-medium">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Tool grid ─────────────────────────────────────────── */}
        <motion.div
          id="tools"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.65, ease: "easeOut" }}
          className="mt-16 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6"
        >
          {SHOWCASE_TOOLS.map((tool, i) => (
            <Link
              key={tool.id}
              href={tool.route}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-transparent"
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md",
                  tool.color
                )}
              >
                <ToolIcon name={tool.icon} className="h-7 w-7" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-foreground">
                {tool.name}
              </span>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
