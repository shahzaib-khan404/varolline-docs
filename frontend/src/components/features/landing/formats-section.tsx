"use client";

import { motion } from "framer-motion";

const FORMATS = [
  { ext: "PDF", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { ext: "DOCX", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { ext: "JPG", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { ext: "PNG", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  { ext: "PPTX", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { ext: "XLSX", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
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
    <section className="border-t py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          {/* Left — formats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Supported formats
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Works with all major formats
            </h2>
            <p className="mt-3 text-muted-foreground">
              Whether you&apos;re working with PDFs, Word documents, images, or
              spreadsheets — we handle them all.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {FORMATS.map((f) => (
                <span
                  key={f.ext}
                  className={`inline-flex h-10 w-16 items-center justify-center rounded-lg text-sm font-bold ${f.color}`}
                >
                  {f.ext}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — feature list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
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
