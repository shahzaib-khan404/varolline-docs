"use client";

import { motion } from "framer-motion";

const FORMATS = [
  { ext: "PDF", dot: "bg-red-500" },
  { ext: "DOCX", dot: "bg-blue-500" },
  { ext: "JPG", dot: "bg-emerald-500" },
  { ext: "PNG", dot: "bg-violet-500" },
  { ext: "PPTX", dot: "bg-orange-500" },
  { ext: "XLSX", dot: "bg-teal-500" },
];

const FEATURES = [
  "Up to 100 MB per file",
  "Files deleted after 24 hours",
  "SSL-encrypted transfer",
  "No watermarks added",
  "No account required",
  "Unlimited conversions",
];

export function FormatsSection() {
  return (
    <section className="border-t border-border/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          {/* Left — formats */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Supported formats
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Works with all major formats
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Whether you&apos;re working with PDFs, Word documents, images, or
              spreadsheets — we handle them all.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <span
                  key={f.ext}
                  className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card/60 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-foreground select-none"
                >
                  <span className={`h-1.5 w-1.5 rounded-none ${f.dot}`} />
                  {f.ext}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — feature list */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <ul className="space-y-2.5">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-none bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
