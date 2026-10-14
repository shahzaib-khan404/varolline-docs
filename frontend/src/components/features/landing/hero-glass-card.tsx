"use client";

import { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
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
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type DemoMode = "compress" | "merge" | "protect" | "convert";

export function HeroGlassCard() {
  const [activeTab, setActiveTab] = useState<DemoMode>("compress");
  const [compressLevel, setCompressLevel] = useState<number>(75);

  // 3D Mouse Parallax Tilt Physics (Timothy Ricks style)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["9deg", "-9deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-9deg", "9deg"]);

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
      className="relative mx-auto mt-14 max-w-4xl"
    >
      {/* Radiant Ice Blue Ambient Aura */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-sky-400/30 via-cyan-400/25 to-blue-600/30 blur-3xl opacity-80 pointer-events-none" />

      {/* 3D Tilting Ultra-Blur Glass Container */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 35, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-ultra relative rounded-3xl p-6 sm:p-8 backdrop-blur-[32px] overflow-hidden"
      >
        {/* Specular Diagonal Light Sheen */}
        <div className="glass-shine absolute inset-0 pointer-events-none" />

        {/* Top Header Row: Interactive Tabs & Status Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-200/60 dark:bg-white/10 p-1 backdrop-blur-md border border-slate-300/60 dark:border-white/15">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeGlassTab"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 shadow-md shadow-sky-500/30"
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

          {/* Real-Time Engine Indicator */}
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/15 dark:bg-sky-500/10 px-3.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400"></span>
            </span>
            <Cpu className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            Active GPU/Rust Processing
          </div>
        </div>

        {/* Dynamic Interactive Stage */}
        <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Interactive Document Canvas */}
          <div className="md:col-span-7 space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "compress" && (
                <motion.div
                  key="compress-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 backdrop-blur-md shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-400/30 shadow-inner">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Annual_Report_2026.pdf</p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Original: 18.4 MB · 48 Pages</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-sky-500/15 border border-sky-400/40 px-3 py-1 text-xs font-black text-sky-700 dark:text-sky-300">
                      -{compressLevel}% Saved
                    </span>
                  </div>

                  {/* Compression Slider with Hashmark Ticks */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Compression Strength</span>
                      <span className="text-sky-700 dark:text-sky-400 font-extrabold">{compressLevel}% (Lossless Engine)</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={40}
                        max={85}
                        value={compressLevel}
                        onChange={(e) => setCompressLevel(Number(e.target.value))}
                        className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-white/15 accent-sky-500"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                      <span>100% Vector Quality</span>
                      <span>Target: {(18.4 * (1 - compressLevel / 100)).toFixed(1)} MB</span>
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
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 space-y-3 backdrop-blur-md shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Selected Documents (3 Queued)</span>
                    <span className="text-sky-700 dark:text-sky-400 font-extrabold">Ready to Combine</span>
                  </div>
                  {["01_Executive_Summary.pdf", "02_Financial_Projections.pdf", "03_Appendix.pdf"].map((fn, idx) => (
                    <div key={fn} className="flex items-center justify-between rounded-xl bg-white/80 dark:bg-card/70 p-2.5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/20 text-[10px] font-black text-sky-700 dark:text-sky-400">
                          {idx + 1}
                        </span>
                        <span>{fn}</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
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
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 space-y-4 backdrop-blur-md shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-400/30">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Military-Grade AES-256 Encryption</p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dual User & Owner Password Protection</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-card/70 p-3 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 dark:text-slate-400 tracking-widest font-bold">••••••••••••••••</span>
                    <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-extrabold text-sky-700 dark:text-sky-300 border border-sky-400/30">Hardware Locked</span>
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
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 space-y-3 backdrop-blur-md shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Source: Adobe PDF</span>
                    <span className="text-sky-700 dark:text-sky-400 font-extrabold">Output: Microsoft Word (.docx)</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 py-3">
                    <div className="rounded-xl bg-sky-500/15 border border-sky-400/30 p-3 text-center">
                      <FileText className="h-7 w-7 text-sky-600 dark:text-sky-400 mx-auto" />
                      <p className="mt-1 text-[11px] font-bold text-slate-900 dark:text-white">Proposal.pdf</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-sky-600 dark:text-sky-400 animate-pulse" />
                    <div className="rounded-xl bg-blue-500/15 border border-blue-400/30 p-3 text-center">
                      <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400 mx-auto" />
                      <p className="mt-1 text-[11px] font-bold text-slate-900 dark:text-white">Proposal.docx</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Key Trust Guarantee & Action CTA */}
          <div className="md:col-span-5 flex flex-col justify-between h-full space-y-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-card/70 p-4 space-y-2 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Zero File Footprint Guarantee
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Rendered with strict privacy. Automated 24h garbage collection with cryptographic erasure.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 w-full rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 font-bold transition-all duration-300"
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
