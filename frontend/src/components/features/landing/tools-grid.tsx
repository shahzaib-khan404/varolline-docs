"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { ToolIcon } from "@/components/ui/tool-icon";
import { TOOL_CATEGORIES } from "@/config/tools";
import type { ToolConfig } from "@/config/tools";

const CATEGORY_LABELS: Record<string, { title: string; subtitle: string }> = {
  pdf:      { title: "PDF Tools",        subtitle: "Merge, split, compress, and manage your PDFs" },
  convert:  { title: "Convert",          subtitle: "Turn PDFs into other formats and vice versa" },
  organize: { title: "Organize & Edit",  subtitle: "Rotate, delete pages, and add watermarks" },
  protect:  { title: "Security",         subtitle: "Password protect and extract text from PDFs" },
};

function ToolCard({ tool }: { tool: ToolConfig }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <Link
        href={tool.route}
        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl"
      >
        {/* Colored top banner */}
        <div
          className={cn(
            "flex items-center justify-center py-7",
            tool.color
          )}
        >
          <ToolIcon name={tool.icon} className="h-10 w-10 text-white drop-shadow-sm" />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-sm font-bold text-foreground leading-snug">{tool.name}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>
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
    <section id="features" className="bg-secondary/40 py-24 dark:bg-secondary/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

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

        {/* Category sections */}
        <div className="space-y-16">
          {Object.entries(TOOL_CATEGORIES).map(([key, tools]) => {
            const meta = CATEGORY_LABELS[key] ?? { title: key, subtitle: "" };
            return (
              <div key={key}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground">{meta.title}</h3>
                  {meta.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{meta.subtitle}</p>}
                </div>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-60px" }}
                  className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                >
                  {tools.map((tool) => (
                    <motion.div key={tool.id} variants={cardVariants}>
                      <ToolCard tool={tool} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
