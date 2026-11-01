"use client";

import { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sliders,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type DemoMode = "compress" | "merge" | "protect" | "convert";

export function HeroGlassCard() {
  const [activeTab, setActiveTab] = useState<DemoMode>("compress");
  const [compressLevel, setCompressLevel] = useState<number>(75);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const tabs: Array<{ id: DemoMode; label: string; icon: any }> = [
    { id: "compress", label: "Compress", icon: Sliders },
    { id: "merge", label: "Merge", icon: Layers },
    { id: "protect", label: "Protect", icon: Lock },
    { id: "convert", label: "Convert", icon: Sparkles },
  ];

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative mx-auto mt-12 max-w-4xl"
    >
      {/* Container */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-ultra relative rounded-none p-5 sm:p-7 overflow-hidden"
      >
        {/* Top Header Row: Interactive Tabs & Status Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 border border-border/60 rounded-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 rounded-none px-3.5 py-1.5 text-xs font-semibold transition-colors min-h-[38px] ${
                    isActive
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Engine Indicator */}
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-card/60 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-none bg-sky-500" />
            <Cpu className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Active GPU/Rust Processing</span>
          </div>
        </div>

        {/* Dynamic Interactive Stage */}
        <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Interactive Document Canvas */}
          <div className="md:col-span-7 space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "compress" && (
                <motion.div
                  key="compress-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-none border border-border bg-card/60 p-4 sm:p-5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-foreground truncate">Annual_Report_2026.pdf</p>
                        <p className="text-xs text-muted-foreground">Original: 18.4 MB · 48 Pages</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-none bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                      -{compressLevel}% Saved
                    </span>
                  </div>

                  {/* Compression Slider */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Compression Strength</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">{compressLevel}% (Lossless)</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={40}
                        max={85}
                        value={compressLevel}
                        onChange={(e) => setCompressLevel(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-none bg-muted accent-sky-600"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                      <span>100% Vector Quality</span>
                      <span>Target: {(18.4 * (1 - compressLevel / 100)).toFixed(1)} MB</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "merge" && (
                <motion.div
                  key="merge-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-none border border-border bg-card/60 p-4 sm:p-5 space-y-2.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Selected Documents (3 Queued)</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">Ready to Combine</span>
                  </div>
                  {["01_Executive_Summary.pdf", "02_Financial_Projections.pdf", "03_Appendix.pdf"].map((fn, idx) => (
                    <div key={fn} className="flex items-center justify-between rounded-none bg-background/70 p-2 border border-border text-xs font-medium text-foreground">
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-none bg-sky-500/10 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          {idx + 1}
                        </span>
                        <span className="truncate">{fn}</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 ml-2" />
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "protect" && (
                <motion.div
                  key="protect-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-none border border-border bg-card/60 p-4 sm:p-5 space-y-3 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">AES-256 Encryption</p>
                      <p className="text-xs text-muted-foreground">Dual User & Owner Password Protection</p>
                    </div>
                  </div>
                  <div className="rounded-none bg-background/70 p-2.5 border border-border flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground tracking-widest font-bold">••••••••••••••••</span>
                    <span className="rounded-none bg-sky-500/10 px-2 py-0.5 font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">Locked</span>
                  </div>
                </motion.div>
              )}

              {activeTab === "convert" && (
                <motion.div
                  key="convert-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-none border border-border bg-card/60 p-4 sm:p-5 space-y-3 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Source: Adobe PDF</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">Output: Microsoft Word (.docx)</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 py-3">
                    <div className="rounded-none bg-muted/60 border border-border p-3 text-center">
                      <FileText className="h-6 w-6 text-foreground mx-auto" />
                      <p className="mt-1 text-[11px] font-semibold text-foreground">Proposal.pdf</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <div className="rounded-none bg-muted/60 border border-border p-3 text-center">
                      <FileText className="h-6 w-6 text-sky-600 dark:text-sky-400 mx-auto" />
                      <p className="mt-1 text-[11px] font-semibold text-foreground">Proposal.docx</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Key Trust Guarantee & Action CTA */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3">
            <div className="rounded-none border border-border bg-card/60 p-4 space-y-2 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Zero File Footprint Guarantee
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Processed with strict privacy. Automated 24h garbage collection with cryptographic erasure.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 w-full rounded-none border border-border bg-card/80 text-foreground hover:bg-muted font-semibold min-h-[44px]"
            >
              <Link href={activeTab === "compress" ? "/tools/compress-pdf" : activeTab === "merge" ? "/tools/merge-pdf" : activeTab === "protect" ? "/tools/protect-pdf" : "/tools/pdf-to-word"}>
                Try {tabs.find((t) => t.id === activeTab)?.label} Free Online
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
