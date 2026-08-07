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
    color: "bg-blue-500",
  },
  {
    icon: Settings2,
    step: "02",
    title: "Choose your tool",
    description:
      "Pick from 12 document tools. Configure options like page ranges, compression level, or watermark text.",
    color: "bg-violet-500",
  },
  {
    icon: Download,
    step: "03",
    title: "Download instantly",
    description:
      "Your file is processed in seconds. Download the result immediately — it's auto-deleted from our servers after 24 hours.",
    color: "bg-emerald-500",
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
  show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } },
};

export function HowItWorks() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Done in three steps
          </h2>
          <p className="mt-4 text-muted-foreground">
            No complicated software. No account needed for most tools. Just
            upload, process, and download.
          </p>
        </div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="relative mt-16 grid gap-8 md:grid-cols-3"
        >
          {/* Connector line (desktop) */}
          <div
            className="absolute left-1/3 right-1/3 top-8 hidden h-px bg-border md:block"
            aria-hidden="true"
          />

          {STEPS.map((step) => (
            <motion.div
              key={step.step}
              variants={itemVariants}
              className="relative flex flex-col items-center text-center"
            >
              {/* Icon circle */}
              <div
                className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg ${step.color}`}
              >
                <step.icon className="h-7 w-7" />
              </div>

              {/* Step number */}
              <span className="mt-4 text-xs font-bold tracking-widest text-muted-foreground">
                STEP {step.step}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
