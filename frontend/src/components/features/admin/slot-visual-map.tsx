"use client";

import { cn } from "@/lib/utils/cn";
import type { AdSlotInfo } from "@/types/ads";

interface SlotVisualMapProps {
  slots: AdSlotInfo[];
  selectedSlot: number | null;
  onSelectSlot: (slotNumber: number) => void;
}

export function SlotVisualMap({ slots, selectedSlot, onSelectSlot }: SlotVisualMapProps) {
  const getSlot = (num: number) => slots.find((s) => s.slot_number === num);

  const renderSlotButton = (slotNumber: number, label: string, extraClass: string) => {
    const slot = getSlot(slotNumber);
    const hasActiveAd = Boolean(slot?.active_ad && slot.active_ad.is_active);
    const isSelected = selectedSlot === slotNumber;

    return (
      <button
        type="button"
        onClick={() => onSelectSlot(slotNumber)}
        className={cn(
          "relative flex items-center justify-center p-2 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer select-none",
          hasActiveAd
            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            : "bg-muted/40 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          extraClass
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
              hasActiveAd
                ? "bg-emerald-500 text-white"
                : "bg-muted-foreground/30 text-foreground"
            )}
          >
            #{slotNumber}
          </span>
          <span className="truncate">{label}</span>
        </div>

        {/* Live Status indicator */}
        <span
          className={cn(
            "absolute top-1.5 right-1.5 h-2 w-2 rounded-full",
            hasActiveAd ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
          )}
          title={hasActiveAd ? "Active Ad Running" : "Empty Slot"}
        />
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Interactive Ad Placement Map</h3>
          <p className="text-xs text-muted-foreground">
            Click on any numbered container slot to view, upload, replace, or remove ads.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Active Ad</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">Empty Slot</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Layout 1: Tool Workspace Pages (Slots 1, 2, 3, 4) */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Tool Workspace Layout (e.g. Redact, Merge, Sign)
          </div>

          {/* Top Banner (Slot 3) */}
          {renderSlotButton(3, "Top Leaderboard #3", "w-full h-10")}

          <div className="grid grid-cols-12 gap-2 h-44">
            {/* Left Skyscraper (Slot 1) */}
            <div className="col-span-3">
              {renderSlotButton(1, "Left #1", "w-full h-full flex-col text-center")}
            </div>

            {/* Simulated Tool Workspace */}
            <div className="col-span-6 rounded-xl border border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center p-3 text-center">
              <span className="text-xs font-semibold text-foreground">PDF Tool Workspace</span>
              <span className="text-[10px] text-muted-foreground">Dropzone & Controls</span>
            </div>

            {/* Right Skyscraper (Slot 2) */}
            <div className="col-span-3">
              {renderSlotButton(2, "Right #2", "w-full h-full flex-col text-center")}
            </div>
          </div>

          {/* Bottom Banner (Slot 4) */}
          {renderSlotButton(4, "Bottom Anchor #4", "w-full h-10")}
        </div>

        {/* Layout 2: Landing Page Sections (Slots 5, 6, 7) */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Landing Page Sections (Home Page)
          </div>

          <div className="space-y-2 h-[262px] flex flex-col justify-between">
            <div className="rounded-lg bg-background/50 p-2 text-center text-[10px] text-muted-foreground border">
              Hero Section (Headline & CTA)
            </div>

            {/* Slot 5: Post-Hero */}
            {renderSlotButton(5, "Post-Hero Section #5", "w-full h-12")}

            <div className="rounded-lg bg-background/50 p-2 text-center text-[10px] text-muted-foreground border">
              Tools Grid & Features
            </div>

            {/* Slot 6: Mid-Page */}
            {renderSlotButton(6, "Mid-Page Section #6", "w-full h-12")}

            {/* Slot 7: Pre-Footer */}
            {renderSlotButton(7, "Pre-Footer Section #7", "w-full h-12")}
          </div>
        </div>
      </div>
    </div>
  );
}
