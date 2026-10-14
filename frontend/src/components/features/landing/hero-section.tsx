"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolIcon } from "@/components/ui/tool-icon";
import { TOOLS } from "@/config/tools";
import { cn } from "@/lib/utils/cn";
import { AmbientVideoBackground } from "@/components/ui/ambient-video-background";
import { HeroGlassCard } from "./hero-glass-card";

const SHOWCASE_TOOLS = TOOLS.slice(0, 12);

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1], duration: 0.6 } },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* ── High-Definition Looping 3D Fluid Video & Ice Blue Aurora ── */}
      <AmbientVideoBackground />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Headline & Hero Header ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          {/* Shimmering Ice Blue Badge */}
          <motion.div variants={fadeUp} className="mb-6 inline-flex">
            <div className="group relative inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs font-bold text-foreground backdrop-blur-xl shadow-lg shadow-sky-500/10 transition-all hover:border-sky-400/50 hover:scale-[1.02]">
              <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="gradient-text font-black">100% Free · No Limits</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                12 Pro Tools
              </span>
            </div>
          </motion.div>

          {/* H1 Title with Crisp Electric Ice Cyan Gradient (no blurry drop-shadow) */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08]"
          >
            Every PDF Tool.
            <br />
            <span className="gradient-text">
              Crystal Precision.
            </span>
          </motion.h1>

          {/* Subtitle with high-contrast sharp readability */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl font-medium leading-relaxed"
          >
            Merge, split, compress, convert, rotate, and secure documents with lightning speed.
            Clean, zero watermarks, powered by asynchronous high-performance engines.
          </motion.p>

          {/* Action CTAs in Light Blue */}
          <motion.div
            variants={fadeUp}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="h-13 rounded-2xl px-8 text-base font-bold bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.03] transition-all duration-300"
              asChild
            >
              <Link href="/#tools">
                Explore All 12 Tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 rounded-2xl px-8 text-base font-bold border-border bg-card/80 text-foreground backdrop-blur-xl hover:bg-card hover:scale-[1.02] transition-all duration-300 shadow-sm"
              asChild
            >
              <Link href="/auth/register">Create Free Account</Link>
            </Button>
          </motion.div>

          {/* Trust Guarantees */}
          <motion.div
            variants={fadeUp}
            className="mt-9 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-muted-foreground"
          >
            {[
              { icon: ShieldCheck, label: "AES-256 SSL Encryption" },
              { icon: Zap,         label: "Ultra-Fast Async Processing" },
              { icon: Lock,        label: "Auto-Deleted in 24 Hours" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── 3D Tilt Frosted Glass Document Card (blur 2em) ── */}
        <HeroGlassCard />

      </div>
    </section>
  );
}
