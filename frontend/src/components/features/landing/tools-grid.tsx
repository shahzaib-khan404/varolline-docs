"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ILovePdfBadge } from "./ilovepdf-badge";
import { TOOLS } from "@/config/tools";
import type { ToolConfig } from "@/config/tools";

function ToolCard({ tool }: { tool: ToolConfig }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        href={tool.route}
        className="group relative flex h-full flex-col justify-start rounded-none border border-border/80 bg-card/60 backdrop-blur-md p-5 sm:p-6 shadow-xs transition-colors duration-150 hover:border-primary hover:bg-card/90"
      >
        {/* Top Icon Badge */}
        <div className="mb-3.5">
          <ILovePdfBadge toolId={tool.id} />
        </div>

        {/* Tool Name */}
        <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight transition-colors group-hover:text-primary">
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
  show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.3 } },
};

export function ToolsGrid() {
  return (
    <section id="features" className="relative overflow-hidden py-20 border-y border-border/40">
      {/* Background with calm overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden isolate">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-15 dark:opacity-20 transition-opacity duration-500"
        >
          <source src="/videos/pdf-to-word.mp4" type="video/mp4" />
          <source src="/videos/PDF%20to%20word.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
            All Tools
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Everything you need for PDFs
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            12 powerful tools. All completely free. No watermarks, no limits.
          </p>
        </div>

        {/* Continuous tools grid with clean sharp glass cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
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
