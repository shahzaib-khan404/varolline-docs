"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Lock,
  Layers,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type DemoMode = "compress" | "merge" | "protect" | "convert";

export function HeroInteractiveDock() {
  const [activeTab, setActiveTab] = useState<DemoMode>("compress");
  const [compressLevel, setCompressLevel] = useState<number>(75);

  const tabs: Array<{ id: DemoMode; label: string; icon: any }> = [
    { id: "compress", label: "Compress", icon: Sliders },
    { id: "merge", label: "Merge", icon: Layers },
    { id: "protect", label: "Protect", icon: Lock },
    { id: "convert", label: "Convert", icon: Sparkles },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto mt-14 max-w-4xl"
    >
      {/* Radiant ambient glow behind card */}
      <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-red-500/25 via-rose-500/20 to-amber-500/25 blur-2xl opacity-75 dark:opacity-60" />

      {/* Main Glassmorphic Showcase Dock */}
      <div className="relative rounded-3xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-card/60 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl">
        
        {/* Top Dock Bar: Tabs & Live Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/80 p-1 dark:bg-secondary/40 backdrop-blur-md">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 shadow-md"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Engine Metric Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Instant GPU/Async Engine Active
          </div>
        </div>

        {/* Dynamic Interactive Stage */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left: Interactive Document Mockup */}
          <div className="md:col-span-7 space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "compress" && (
                <motion.div
                  key="compress-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-border/60 bg-secondary/30 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Financial_Audit_2026.pdf</p>
                        <p className="text-xs text-muted-foreground">Original: 18.4 MB · 48 Pages</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      -{compressLevel}% Saved
                    </span>
                  </div>

                  {/* Compression Slider Simulation */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Compression Strength</span>
                      <span className="text-primary">{compressLevel}% (Lossless)</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={85}
                      value={compressLevel}
                      onChange={(e) => setCompressLevel(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Maximum Quality</span>
                      <span>Output: {(18.4 * (1 - compressLevel / 100)).toFixed(1)} MB</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "merge" && (
                <motion.div
                  key="merge-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-border/60 bg-secondary/30 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Queued Files (3 Selected)</span>
                    <span className="text-emerald-500">Ready to Combine</span>
                  </div>
                  {["Chapter_01_Intro.pdf", "Chapter_02_Analysis.pdf", "Appendix_Final.pdf"].map((fn, idx) => (
                    <div key={fn} className="flex items-center justify-between rounded-xl bg-card/80 p-2.5 border border-border/50 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span>{fn}</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "protect" && (
                <motion.div
                  key="protect-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-border/60 bg-secondary/30 p-5 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-border">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Military-Grade PDF Encryption</p>
                      <p className="text-xs text-muted-foreground">AES-256 Bit Hardware Acceleration</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-card/80 p-3 border border-border/50 flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">••••••••••••••••</span>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-500">Encrypted</span>
                  </div>
                </motion.div>
              )}

              {activeTab === "convert" && (
                <motion.div
                  key="convert-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-border/60 bg-secondary/30 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Source: PDF Document</span>
                    <span className="text-primary font-bold">Output: Microsoft Word (.docx)</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 py-3">
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                      <FileText className="h-7 w-7 text-red-500 mx-auto" />
                      <p className="mt-1 text-[11px] font-bold">Document.pdf</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" />
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                      <FileText className="h-7 w-7 text-blue-500 mx-auto" />
                      <p className="mt-1 text-[11px] font-bold">Document.docx</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Quick Action & Live Highlights */}
          <div className="md:col-span-5 flex flex-col justify-between h-full space-y-4">
            <div className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Zero File Footprint Policy
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Processed entirely in volatile RAM cache. Cleaned automatically after 24h with strict encryption.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 font-bold text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] transition-all duration-300"
            >
              <Link href={activeTab === "compress" ? "/tools/compress-pdf" : activeTab === "merge" ? "/tools/merge-pdf" : activeTab === "protect" ? "/tools/protect-pdf" : "/tools/pdf-to-word"}>
                Try {tabs.find((t) => t.id === activeTab)?.label} Online Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
