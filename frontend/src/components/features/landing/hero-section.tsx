"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmbientVideoBackground } from "@/components/ui/ambient-video-background";
import { HeroGlassCard } from "./hero-glass-card";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1], duration: 0.5 } },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
      {/* Background with calm non-glare overlay */}
      <AmbientVideoBackground />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Headline & Hero Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge without gradients or neon */}
          <motion.div variants={fadeUp} className="mb-5 inline-flex">
            <div className="inline-flex items-center gap-2 rounded-none border border-border bg-card/60 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-foreground shadow-xs">
              <span className="flex h-1.5 w-1.5 rounded-none bg-sky-500" />
              <span>100% Free · No Limits</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">12 Pro Tools</span>
            </div>
          </motion.div>

          {/* H1 Title with solid colors */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1]"
          >
            Every PDF Tool.
            <br />
            <span className="text-sky-600 dark:text-sky-400">
              Crystal Precision.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg font-normal leading-relaxed"
          >
            Merge, split, compress, convert, rotate, and secure documents with lightning speed.
            Clean, zero watermarks, powered by asynchronous high-performance engines.
          </motion.p>

          {/* Action CTAs in Solid Colors */}
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-md mx-auto sm:max-w-none"
          >
            <Button
              size="lg"
              className="h-11 rounded-none px-6 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 min-h-[44px]"
              asChild
            >
              <Link href="/#features">
                Explore All 12 Tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-none px-6 text-sm font-semibold border-border bg-card/60 text-foreground backdrop-blur-md hover:bg-muted min-h-[44px]"
              asChild
            >
              <Link href="/auth/register">Create Free Account</Link>
            </Button>
          </motion.div>

          {/* Trust Guarantees — Responsive Frosted Glass Panel */}
          <motion.div
            variants={fadeUp}
            className="mt-8 mx-auto max-w-2xl rounded-none border border-border/80 bg-card/60 dark:bg-card/40 backdrop-blur-xl p-3 sm:p-4 shadow-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-foreground">
              {[
                { icon: ShieldCheck, label: "AES-256 SSL Encryption" },
                { icon: Zap,         label: "Ultra-Fast Async Processing" },
                { icon: Lock,        label: "Auto-Deleted in 24 Hours" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center justify-center sm:justify-start gap-2.5 min-h-[44px] py-1 px-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-left font-medium">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* 3D Frosted Glass Document Card */}
        <HeroGlassCard />
      </div>
    </section>
  );
}
