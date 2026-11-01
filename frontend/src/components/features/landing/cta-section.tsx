"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-none bg-sky-600 px-6 py-14 text-center text-white sm:px-12 shadow-xs"
        >
          <h2 className="relative text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to process your first document?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm sm:text-base text-sky-100">
            No sign-up. No credit card. No catch. Pick a tool and start in
            seconds.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="rounded-none font-semibold min-h-[44px]"
            >
              <Link href="/tools/merge-pdf">
                Merge PDF — Start now
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="rounded-none border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white min-h-[44px]"
            >
              <Link href="/#features">Browse all tools</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
