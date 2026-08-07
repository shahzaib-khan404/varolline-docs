"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

const STATS = [
  { value: 5000000, label: "Files processed", suffix: "+" },
  { value: 200000, label: "Happy users", suffix: "+" },
  { value: 12, label: "Free tools", suffix: "" },
  { value: 99.9, label: "Uptime", suffix: "%" },
];

function useCountUp(target: number, duration = 2000, active = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const isFloat = !Number.isInteger(target);
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = isFloat
        ? parseFloat((eased * target).toFixed(1))
        : Math.floor(eased * target);
      setCount(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);

  return count;
}

function Stat({
  value,
  label,
  suffix,
  active,
}: {
  value: number;
  label: string;
  suffix: string;
  active: boolean;
}) {
  const count = useCountUp(value, 2000, active);

  const formatted =
    value >= 1_000_000
      ? `${(count / 1_000_000).toFixed(1)}M`
      : value >= 1_000
      ? `${(count / 1_000).toFixed(0)}K`
      : String(count);

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-4xl font-bold tracking-tight sm:text-5xl">
        {formatted}
        {suffix}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="border-y bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-10 md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <Stat
              key={stat.label}
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
              active={inView}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
