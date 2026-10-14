"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is uLovepdf really free?",
    a: "Yes. All 12 core tools are completely free with no usage limits, no watermarks, and no account required. We plan to offer a paid Pro plan with batch processing and API access in the future, but core tools will always remain free.",
  },
  {
    q: "Are my files safe? Who can see them?",
    a: "Your files are transferred over SSL/TLS, processed in an isolated environment, and automatically deleted from our servers 24 hours after processing. We never read or share your file contents. No employees have access to user files.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account is required to use any of the free tools. Creating an account lets you track your processing history and download results later. OAuth login via Google and GitHub is available.",
  },
  {
    q: "What is the maximum file size?",
    a: "We accept files up to 100 MB per upload. If you regularly work with larger files, contact us — we're happy to raise the limit for enterprise users.",
  },
  {
    q: "How long does processing take?",
    a: "Most operations complete in 2–10 seconds for typical file sizes. OCR extraction and large file compression may take up to 60 seconds. Progress is shown in real time.",
  },
  {
    q: "Can I use this for commercial work?",
    a: "Absolutely. There are no restrictions on commercial use of the free tools. uLovepdf is MIT-licensed open source software.",
  },
  {
    q: "Which operating system / browser do I need?",
    a: "Any modern browser on Windows, macOS, Linux, iOS, or Android works fine. No software installation is required.",
  },
  {
    q: "Can I self-host uLovepdf?",
    a: "Yes! The full source code is available on GitHub under the MIT license. Docker Compose files are included for easy self-hosted deployment.",
  },
];

export function FAQSection() {
  return (
    <section className="border-t py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[280px_1fr]">
          {/* Left sticky header */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="md:sticky md:top-24 md:self-start"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              FAQ
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Common questions
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Can&apos;t find the answer you&apos;re looking for?{" "}
              <a href="/contact" className="text-primary underline underline-offset-4">
                Contact us
              </a>
              .
            </p>
          </motion.div>

          {/* Right — accordion */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
