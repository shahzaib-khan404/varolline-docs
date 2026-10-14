"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Sparkles,
  MousePointerClick,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adsApi } from "@/lib/api/ads";
import { SlotVisualMap } from "./slot-visual-map";
import { AdSlotCard } from "./ad-slot-card";
import { AdUploadModal } from "./ad-upload-modal";
import { QuickAdLauncher } from "./quick-ad-launcher";
import type { AdSlotInfo } from "@/types/ads";

export function AdminAdsView() {
  const queryClient = useQueryClient();
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number>(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSlotNumber, setModalSlotNumber] = useState(1);
  const [filterMode, setFilterMode] = useState<"all" | "tools" | "landing">("all");

  const {
    data: slots = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AdSlotInfo[]>({
    queryKey: ["admin-slots"],
    queryFn: adsApi.getAdminSlots,
  });

  const invalidateAds = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-slots"] });
    queryClient.invalidateQueries({ queryKey: ["active-ads"] });
  };

  const handleOpenUpload = (slotNumber: number) => {
    setModalSlotNumber(slotNumber);
    setModalOpen(true);
  };

  const handleToggleActive = async (slotNumber: number, currentActive: boolean) => {
    await adsApi.updateAd(slotNumber, { is_active: !currentActive });
    invalidateAds();
  };

  const handleRemove = async (slotNumber: number) => {
    await adsApi.removeAd(slotNumber);
    invalidateAds();
  };

  // Metrics computation
  const activeAdsCount = slots.filter((s) => s.active_ad?.is_active).length;
  const totalClicks = slots.reduce((acc, s) => acc + (s.active_ad?.click_count || 0), 0);
  const totalImpressions = slots.reduce((acc, s) => acc + (s.active_ad?.impression_count || 0), 0);
  const overallCtr =
    totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  // Filter slots
  const filteredSlots = slots.filter((s) => {
    if (filterMode === "tools") return s.slot_number <= 4;
    if (filterMode === "landing") return s.slot_number >= 5;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Marketing & Ad Banners
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              Live System
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage product promotional images and videos across all numbered container slots (Slots #1 - #7).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenUpload(selectedSlotNumber || 1)}
            className="text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Ad Creative</span>
          </Button>
        </div>
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Ads</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {activeAdsCount} <span className="text-xs font-normal text-muted-foreground">/ {slots.length || 7} Slots</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {slots.length - activeAdsCount} empty slots cleanly collapsed
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Clicks</span>
            <MousePointerClick className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalClicks}</div>
          <p className="text-[11px] text-muted-foreground">Recorded marketing conversions</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Impressions</span>
            <Eye className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalImpressions}</div>
          <p className="text-[11px] text-muted-foreground">Zero-CLS served banners</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Avg CTR</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{overallCtr}%</div>
          <p className="text-[11px] text-muted-foreground">Overall click-through rate</p>
        </div>
      </div>

      {/* Quick Ad Launcher & Publisher */}
      <QuickAdLauncher slots={slots} onSuccess={invalidateAds} />

      {/* Visual Placement Map */}
      <SlotVisualMap
        slots={slots}
        selectedSlot={selectedSlotNumber}
        onSelectSlot={(num) => {
          setSelectedSlotNumber(num);
          // Auto scroll to slot card
          const el = document.getElementById(`slot-card-${num}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      />

      {/* Slot Management Grid & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Container Slots (#1 - #7)</h2>
          </div>

          {/* Filtering tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filterMode === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Slots (7)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("tools")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filterMode === "tools"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tool Pages (#1-4)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("landing")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filterMode === "landing"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Landing Page (#5-7)
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className="h-72 rounded-2xl border border-border/50 bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSlots.map((slot) => (
              <div
                key={slot.slot_number}
                id={`slot-card-${slot.slot_number}`}
                className={
                  selectedSlotNumber === slot.slot_number
                    ? "ring-2 ring-primary rounded-2xl transition-all"
                    : ""
                }
              >
                <AdSlotCard
                  slot={slot}
                  onUploadClick={handleOpenUpload}
                  onToggleActive={handleToggleActive}
                  onRemoveClick={handleRemove}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creative Upload & Replace Modal */}
      {modalOpen && (
        <AdUploadModal
          key={`ad-modal-slot-${modalSlotNumber}`}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          slots={slots}
          defaultSlotNumber={modalSlotNumber}
          onSuccess={invalidateAds}
        />
      )}
    </div>
  );
}
