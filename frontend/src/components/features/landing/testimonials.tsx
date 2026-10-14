"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Operations Manager",
    company: "Acme Corp",
    avatar: "SC",
    rating: 5,
    quote:
      "We replaced our paid PDF subscription with uLovepdf. It handles our daily merge and compress workflow perfectly — and it's completely free.",
  },
  {
    name: "Marcus Webb",
    role: "Freelance Designer",
    company: "",
    avatar: "MW",
    rating: 5,
    quote:
      "The PDF to image conversion is the best I've found. Pixel-perfect output every time, and the drag-and-drop interface makes it effortless.",
  },
  {
    name: "Priya Nair",
    role: "Legal Assistant",
    company: "LawFirm LLP",
    avatar: "PN",
    rating: 5,
    quote:
      "Password-protecting and watermarking contracts used to take us 20 minutes. Now it's 20 seconds. The OCR extraction is a game-changer.",
  },
  {
    name: "James Okafor",
    role: "Product Manager",
    company: "Startup HQ",
    avatar: "JO",
    rating: 5,
    quote:
      "I love that it works without an account. Just upload, process, download. No tracking, no upsells, no nonsense. Exactly what a tool should be.",
  },
  {
    name: "Amira Hassan",
    role: "University Lecturer",
    company: "City University",
    avatar: "AH",
    rating: 5,
    quote:
      "Splitting course handouts into individual chapter PDFs for 200 students used to be a chore. Now it takes seconds. My students love me for it.",
  },
  {
    name: "Tom Breckenridge",
    role: "Small Business Owner",
    company: "Fresh Roast Co.",
    avatar: "TB",
    rating: 5,
    quote:
      "The Word to PDF conversion preserves my invoice formatting perfectly — even with custom fonts. Better than what I was paying for before.",
  },
];

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } },
};

export function Testimonials() {
  return (
    <section className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Testimonials
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by teams and individuals
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join 200,000+ people who trust uLovepdf for their daily
            document workflows.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              variants={cardVariants}
              className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm"
            >
              <Stars count={t.rating} />
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    AVATAR_COLORS[i % AVATAR_COLORS.length]
                  )}
                >
                  {t.avatar}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}
                    {t.company && ` · ${t.company}`}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
