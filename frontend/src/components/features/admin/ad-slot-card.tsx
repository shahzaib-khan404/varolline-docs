"use client";

import { useState } from "react";
import {
  Upload,
  RefreshCw,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { AdSlotInfo } from "@/types/ads";

interface AdSlotCardProps {
  slot: AdSlotInfo;
  onUploadClick: (slotNumber: number) => void;
  onToggleActive: (slotNumber: number, currentActive: boolean) => Promise<void>;
  onRemoveClick: (slotNumber: number) => Promise<void>;
}

export function AdSlotCard({
  slot,
  onUploadClick,
  onToggleActive,
  onRemoveClick,
}: AdSlotCardProps) {
  const ad = slot.active_ad;
  const isOccupied = Boolean(ad);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = async () => {
    if (!ad) return;
    try {
      setLoadingAction(true);
      await onToggleActive(slot.slot_number, ad.is_active);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemove = async () => {
    try {
      setLoadingAction(true);
      await onRemoveClick(slot.slot_number);
      setConfirmDelete(false);
    } finally {
      setLoadingAction(false);
    }
  };

  const ctr = ad && ad.impression_count > 0
    ? ((ad.click_count / ad.impression_count) * 100).toFixed(1)
    : "0.0";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xs",
        isOccupied && ad?.is_active
          ? "border-border hover:border-primary/40"
          : "border-dashed border-border/80 bg-card/60"
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
              #{slot.slot_number}
            </span>
            <h4 className="text-sm font-bold text-foreground">{slot.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{slot.placement}</p>
        </div>

        {/* Status Badge */}
        {isOccupied ? (
          ad?.is_active ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <PauseCircle className="h-3 w-3" />
              Paused
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Empty (Collapsed)
          </span>
        )}
      </div>

      {/* Media Preview or Empty Placeholder */}
      <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/30 aspect-video flex items-center justify-center">
        {isOccupied && ad?.media_url ? (
          <>
            {(() => {
              const displayUrl = (ad.media_url || "").replace(
                /^https?:\/\/[^/]+(?::\d+)?(\/api\/v1\/files\/download\/)/i,
                "$1"
              );
              return ad.media_type === "video" ? (
                <video
                  src={displayUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayUrl}
                  alt={ad.headline || slot.name}
                  className="h-full w-full object-cover"
                />
              );
            })()}

            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {ad.media_type === "video" ? (
                <Video className="h-3 w-3 text-sky-400" />
              ) : (
                <ImageIcon className="h-3 w-3 text-emerald-400" />
              )}
              <span className="capitalize">{ad.media_type}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Upload className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">No creative active</p>
            <p className="text-[10px] text-muted-foreground/80 font-mono">
              Rec: {slot.suggested_size}
            </p>
          </div>
        )}
      </div>

      {/* Details & Metrics (if occupied) */}
      {isOccupied && ad && (
        <div className="space-y-2.5 text-xs">
          {/* Target Link */}
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-medium text-foreground truncate max-w-[200px]" title={ad.target_url}>
              {ad.headline || ad.target_url}
            </span>
            <a
              href={ad.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>Link</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Quick Stats: Clicks & Impressions */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MousePointerClick className="h-3.5 w-3.5 text-primary" />
              <span>Clicks: <strong className="text-foreground">{ad.click_count}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-3.5 w-3.5 text-amber-500" />
              <span>CTR: <strong className="text-foreground">{ctr}%</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-border/60">
        {confirmDelete ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Remove ad from Slot #{slot.slot_number}?</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={loadingAction}
                onClick={handleRemove}
                className="w-full text-xs"
              >
                Yes, Remove
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingAction}
                onClick={() => setConfirmDelete(false)}
                className="w-full text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isOccupied ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUploadClick(slot.slot_number)}
                  className="flex-1 text-xs gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Replace</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loadingAction}
                  onClick={handleToggle}
                  className="text-xs"
                  title={ad?.is_active ? "Pause Ad" : "Activate Ad"}
                >
                  {ad?.is_active ? "Pause" : "Resume"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-muted-foreground hover:text-destructive p-2"
                  title="Remove Ad"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => onUploadClick(slot.slot_number)}
                className="w-full text-xs gap-1.5 shadow-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Ad to Slot #{slot.slot_number}</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
