"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolIcon } from "@/components/ui/tool-icon";
import { TOOLS } from "@/config/tools";
import { cn } from "@/lib/utils/cn";

// The 6 most-used tools surfaced in the dashboard
const QUICK_TOOLS = TOOLS.filter((t) =>
  ["merge_pdf", "split_pdf", "compress_pdf", "pdf_to_word", "pdf_to_image", "ocr_extraction"].includes(t.id)
);

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function QuickTools() {
  return (
    <Card>
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Quick tools</CardTitle>
          <Link
            href="/tools"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            All tools
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {QUICK_TOOLS.map((tool) => (
            <motion.div key={tool.id} variants={item}>
              <Link
                href={tool.route}
                className="group flex items-center gap-2.5 rounded-lg border bg-card p-3 text-sm transition-all hover:border-primary/30 hover:bg-accent"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white",
                    tool.color
                  )}
                >
                  <ToolIcon name={tool.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-xs font-medium">{tool.name}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
