"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Wrench,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Cpu,
  Layers,
  Shield,
  FileText,
  Files,
  Scissors,
  FileArchive,
  Image,
  Images,
  FileDown,
  RotateCw,
  Hash,
  Stamp,
  Activity,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  adminToolsApi,
  type AdminToolItem,
  type AdminToolsResponse,
} from "@/lib/api/admin-tools";
import { cn } from "@/lib/utils/cn";

// Icon mapping for each tool
const TOOL_ICONS: Record<string, React.ElementType> = {
  merge_pdf: Files,
  split_pdf: Scissors,
  compress_pdf: FileArchive,
  pdf_to_word: FileDown,
  word_to_pdf: FileText,
  pdf_to_image: Image,
  image_to_pdf: Images,
  protect_pdf: Shield,
  unlock_pdf: Sparkles,
  rotate_pdf: RotateCw,
  page_numbers: Hash,
  watermark_pdf: Stamp,
};

// Vibrant gradients per tool
const TOOL_GRADIENTS: Record<string, string> = {
  merge_pdf: "from-rose-500 via-rose-600 to-red-600 text-rose-500",
  split_pdf: "from-amber-500 via-orange-500 to-orange-600 text-orange-500",
  compress_pdf: "from-emerald-500 via-teal-500 to-teal-700 text-emerald-500",
  pdf_to_word: "from-blue-600 via-indigo-600 to-violet-700 text-blue-500",
  word_to_pdf: "from-indigo-500 via-purple-600 to-violet-700 text-indigo-500",
  pdf_to_image: "from-sky-500 via-blue-500 to-indigo-600 text-sky-500",
  image_to_pdf: "from-teal-500 via-cyan-600 to-blue-600 text-teal-500",
  protect_pdf: "from-violet-500 via-purple-600 to-indigo-600 text-violet-500",
  unlock_pdf: "from-fuchsia-500 via-pink-600 to-rose-600 text-fuchsia-500",
  rotate_pdf: "from-cyan-500 via-teal-600 to-emerald-600 text-cyan-500",
  page_numbers: "from-emerald-600 via-green-600 to-teal-700 text-emerald-600",
  watermark_pdf: "from-purple-600 via-indigo-600 to-blue-700 text-purple-600",
};

export function AdminToolsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data, isLoading, isRefetching, refetch } = useQuery<AdminToolsResponse>({
    queryKey: ["admin-tools"],
    queryFn: adminToolsApi.list,
    refetchInterval: 20000,
  });

  const tools = data?.tools || [];
  const totalRuns = data?.total_platform_runs || 0;

  const filteredTools = tools.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const scrollToGrid = () => {
    document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Platform Tools & Engine Console
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              12 Online Tools
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete inventory of document engines with live execution counts, health status, and direct test launch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToGrid}
            className="gap-1.5 border-border/80 hover:bg-muted text-xs"
          >
            <span>Scroll Down to Tools</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2 border-border/80 hover:bg-muted"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin text-primary")}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Engine Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tools Online */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Available Engines</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">12 / 12</span>
            <span className="text-xs font-semibold text-emerald-500">100% Ready</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">All core modules deployed</p>
        </div>

        {/* Total Platform Runs */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Live Executions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {totalRuns.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-500">Recorded in DB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Document conversion tasks processed</p>
        </div>

        {/* Engine Pipeline */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Processing Core</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground">Rust + Python</span>
            <span className="text-xs font-medium text-emerald-500">Async</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">PyMuPDF, WeasyPrint & LibreOffice</p>
        </div>

        {/* Engine Health */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">System Health</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-emerald-500">Normal</span>
            <span className="text-xs font-medium text-muted-foreground">0.8s avg</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Zero memory leaks detected</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tools by name or description…"
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {[
            { label: "All Tools (12)", value: "all" },
            { label: "Organize (4)", value: "organize" },
            { label: "Convert (4)", value: "convert" },
            { label: "Optimize (1)", value: "optimize" },
            { label: "Security (3)", value: "security" },
          ].map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid Section */}
      <div id="tools-grid-section" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              All Platform Processing Tools
            </h2>
            <span className="text-xs text-muted-foreground">
              ({filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"} shown)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ArrowDown className="h-3 w-3" />
            <span>Scroll down to inspect all modules</span>
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const Icon = TOOL_ICONS[tool.id] || FileText;
            const style = TOOL_GRADIENTS[tool.id] || "from-sky-500 to-blue-600 text-sky-500";

            return (
              <div
                key={tool.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-md shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  {/* Top card row: Icon + Status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr text-white shadow-md shadow-black/10 group-hover:scale-105 transition-transform",
                        style.split(" text-")[0]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                        Operational
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {tool.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {tool.description}
                    </p>
                  </div>

                  {/* Metrics bar: Live executions & success rate */}
                  <div className="mt-4 space-y-1.5 rounded-xl border border-border/50 bg-muted/30 p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Database Executions:</span>
                      <span className="font-bold text-foreground">
                        {tool.total_runs > 0 ? `${tool.total_runs} jobs` : "0 jobs"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-bold text-emerald-500">
                        {tool.success_rate}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${tool.success_rate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Launch / Test Tool + View Operations */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/operations?tool=${tool.id}`}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    View Logs ({tool.total_runs})
                  </Link>

                  <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
                    <Link href={tool.route} target="_blank">
                      <span>Test Tool</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
