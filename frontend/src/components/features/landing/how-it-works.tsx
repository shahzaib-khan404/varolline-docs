"use client";

import { motion } from "framer-motion";
import { Upload, Settings2, Download } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload your file",
    description:
      "Drag & drop or browse to select your PDF, Word, or image file. Files up to 100 MB are supported.",
  },
  {
    icon: Settings2,
    step: "02",
    title: "Choose your tool",
    description:
      "Pick from 12 document tools. Configure options like page ranges, compression level, or watermark text.",
  },
  {
    icon: Download,
    step: "03",
    title: "Download instantly",
    description:
      "Your file is processed in seconds. Download the result immediately — it's auto-deleted from our servers after 24 hours.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } },
};

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-20 border-y border-border/40">
      {/* Background with calm overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden isolate">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-75 dark:opacity-60 transition-opacity duration-500"
        >
          <source src="/videos/ocr-watermark.mp4" type="video/mp4" />
          <source src="/videos/OCR&watermark.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/35 dark:bg-background/60" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-card/60 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md mb-3">
            HOW IT WORKS
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Done in three steps
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
            No complicated software. No account needed for most tools. Just
            upload, process, and download.
          </p>
        </div>

        {/* Steps Grid with Sharp Glass Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="relative mt-12 grid gap-5 md:grid-cols-3"
        >
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                variants={itemVariants}
                className="group relative flex flex-col items-center rounded-none border border-border/80 bg-card/60 backdrop-blur-md p-6 text-center shadow-xs transition-colors hover:border-primary/50"
              >
                {/* Step number badge */}
                <div className="flex h-10 w-10 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs border border-sky-500/20 mb-4">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="text-xs font-mono font-semibold text-muted-foreground mb-1">
                  Step {step.step}
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
