"use client";

import { motion } from "framer-motion";
import { Upload, Settings2, Download, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload your file",
    description:
      "Drag & drop or browse to select your PDF, Word, or image file. Files up to 100 MB are supported.",
    color: "from-blue-500 to-sky-400",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: Settings2,
    step: "02",
    title: "Choose your tool",
    description:
      "Pick from 12 document tools. Configure options like page ranges, compression level, or watermark text.",
    color: "from-sky-500 to-cyan-400",
    shadow: "shadow-cyan-500/25",
  },
  {
    icon: Download,
    step: "03",
    title: "Download instantly",
    description:
      "Your file is processed in seconds. Download the result immediately — it's auto-deleted from our servers after 24 hours.",
    color: "from-emerald-500 to-teal-400",
    shadow: "shadow-emerald-500/25",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.6 } },
};

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-28 border-y border-border/40">
      {/* ── High-Definition Hardware-Accelerated Ambient Video ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden transform-gpu [backface-visibility:hidden] isolate">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-45 dark:opacity-55 transition-opacity duration-700 transform-gpu"
        >
          <source src="/videos/ocr-watermark.mp4" type="video/mp4" />
          <source src="/videos/OCR&watermark.mp4" type="video/mp4" />
        </video>

        {/* Soft Vignette & Readability Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/60 to-background/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_95%)] opacity-80" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-bold text-sky-600 dark:text-sky-400 backdrop-blur-md mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            HOW IT WORKS
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Done in three steps
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
            No complicated software. No account needed for most tools. Just
            upload, process, and download.
          </p>
        </div>

        {/* Steps Grid with Frosted Glass Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="relative mt-16 grid gap-8 md:grid-cols-3"
        >
          {STEPS.map((step) => (
            <motion.div
              key={step.step}
              variants={itemVariants}
              className="group relative flex flex-col items-center rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-card/45 p-8 text-center shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-sky-400/40"
            >
              {/* Floating Ambient Aura */}
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-sky-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Icon */}
              <div
                className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr ${step.color} text-white shadow-xl ${step.shadow} group-hover:scale-110 transition-transform duration-300`}
              >
                <step.icon className="h-7 w-7" />
              </div>

              {/* Step number badge */}
              <span className="mt-5 rounded-full bg-sky-500/10 border border-sky-400/20 px-3 py-0.5 text-[11px] font-extrabold tracking-widest text-sky-600 dark:text-sky-300">
                STEP {step.step}
              </span>

              <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
