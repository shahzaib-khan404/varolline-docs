"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16"
        >
          {/* Background decorations */}
          <div
            className="pointer-events-none absolute inset-0 -z-0"
            aria-hidden="true"
          >
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/5" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5" />
            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03]" />
          </div>

          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to process your first document?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/80">
            No sign-up. No credit card. No catch. Pick a tool and start in
            seconds.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="xl"
              variant="secondary"
              asChild
              className="font-semibold"
            >
              <Link href="/tools/merge-pdf">
                Merge PDF — Start now
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              asChild
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/#features">Browse all tools</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
