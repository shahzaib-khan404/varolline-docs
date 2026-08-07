"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "All core tools, no account required.",
    featured: false,
    cta: "Start for free",
    ctaHref: "/tools/merge-pdf",
    features: [
      "All 12 document tools",
      "Up to 100 MB per file",
      "Unlimited conversions",
      "Files deleted after 24 hours",
      "No watermarks",
      "No account needed",
    ],
  },
  {
    name: "Pro",
    price: "$9",
    period: "/ month",
    description: "For teams and power users who need more.",
    featured: true,
    cta: "Coming soon",
    ctaHref: "#",
    features: [
      "Everything in Free",
      "Batch processing (up to 50 files)",
      "Priority queue processing",
      "Files stored for 7 days",
      "API access",
      "Team workspace",
      "Advanced compression settings",
      "Priority support",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            The core tools will always be free. Pro adds batch processing,
            API access, and team features.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 md:gap-8 lg:max-w-3xl lg:mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7",
                plan.featured
                  ? "border-primary bg-primary text-primary-foreground shadow-xl"
                  : "bg-card shadow-sm"
              )}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 bg-amber-400 text-amber-950 hover:bg-amber-400">
                  <Zap className="h-3 w-3" />
                  Most popular
                </Badge>
              )}

              <div>
                <p className={cn("text-sm font-medium", plan.featured ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {plan.name}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={cn("mb-1 text-sm", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {plan.period}
                  </span>
                </div>
                <p className={cn("mt-2 text-sm", plan.featured ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {plan.description}
                </p>
              </div>

              <ul className="my-7 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        plan.featured ? "text-primary-foreground" : "text-primary"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.featured ? "secondary" : "default"}
                size="lg"
                className="w-full"
                asChild={plan.ctaHref !== "#"}
                disabled={plan.ctaHref === "#"}
              >
                {plan.ctaHref !== "#" ? (
                  <Link href={plan.ctaHref}>{plan.cta}</Link>
                ) : (
                  <span>{plan.cta}</span>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          No credit card required for free plan. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
