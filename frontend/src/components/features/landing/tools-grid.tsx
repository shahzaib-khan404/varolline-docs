"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { ToolIcon } from "@/components/ui/tool-icon";
import { TOOL_CATEGORIES, TOOLS } from "@/config/tools";
import type { ToolConfig } from "@/config/tools";

const CATEGORY_LABELS: Record<string, { title: string; subtitle: string }> = {
  pdf:      { title: "PDF Tools",        subtitle: "Merge, split, compress, and manage your PDFs" },
  convert:  { title: "Convert",          subtitle: "Turn PDFs into other formats and vice versa" },
  organize: { title: "Organize & Edit",  subtitle: "Rotate, delete pages, and add watermarks" },
  protect:  { title: "Security",         subtitle: "Password protect and extract text from PDFs" },
};

import { ILovePdfBadge } from "./ilovepdf-badge";

function ToolCard({ tool }: { tool: ToolConfig }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        href={tool.route}
        className="group relative flex h-full flex-col justify-start rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/25 dark:border-white/10 dark:bg-card/90"
      >
        {/* Top Icon Badge in iLovePDF styling */}
        <div className="mb-4">
          <ILovePdfBadge toolId={tool.id} />
        </div>

        {/* Tool Name */}
        <h3 className="text-base font-bold text-foreground tracking-tight transition-colors group-hover:text-primary">
          {tool.name}
        </h3>

        {/* Tool Description */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {tool.description}
        </p>
      </Link>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.4 } },
};

export function ToolsGrid() {
  return (
    <section id="features" className="relative overflow-hidden py-24 border-y border-border/30">
      {/* ── High-Definition Hardware-Accelerated Ambient Video ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden transform-gpu [backface-visibility:hidden] isolate">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-35 dark:opacity-45 transition-opacity duration-700 transform-gpu"
        >
          <source src="/videos/pdf-to-word.mp4" type="video/mp4" />
          <source src="/videos/PDF%20to%20word.mp4" type="video/mp4" />
        </video>

        {/* Soft Vignette & Readability Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/70 to-background/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,hsl(var(--background))_95%)] opacity-85" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">
            All Tools
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need for PDFs
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            12 powerful tools. All completely free. No watermarks, no limits.
          </p>
        </div>

        {/* Unified iLovePDF-style continuous tools grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5"
        >
          {TOOLS.map((tool) => (
            <motion.div key={tool.id} variants={cardVariants}>
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
