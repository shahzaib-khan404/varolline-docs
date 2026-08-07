"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, FileStack, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  iconColor: string;
  iconBg: string;
  index: number;
}

function StatCard({ label, value, icon: Icon, description, iconColor, iconBg, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  const completionRate =
    stats && stats.total_jobs > 0
      ? `${Math.round((stats.completed_jobs / stats.total_jobs) * 100)}% success rate`
      : "No jobs yet";

  const CARDS = [
    {
      label: "Total jobs",
      value: stats?.total_jobs ?? 0,
      icon: FileStack,
      description: completionRate,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Completed",
      value: stats?.completed_jobs ?? 0,
      icon: CheckCircle2,
      description: "Successfully processed",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "In progress",
      value: stats?.pending_jobs ?? 0,
      icon: Clock,
      description: "Pending or processing",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Files uploaded",
      value: stats?.total_files ?? 0,
      icon: TrendingUp,
      description: "Across all tools",
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map((card, i) => (
        <StatCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
}
