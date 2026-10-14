"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Sparkles } from "lucide-react";
import { adsApi } from "@/lib/api/ads";
import { cn } from "@/lib/utils/cn";

export interface AdBannerSlotProps {
  /**
   * Container slot number:
   * 1: Left Skyscraper (Tool Pages)
   * 2: Right Skyscraper (Tool Pages)
   * 3: Top Leaderboard (Tool Pages)
   * 4: Bottom Anchor (Tool Pages)
   * 5: Landing Post-Hero Banner
   * 6: Landing Mid-Page Banner
   * 7: Landing Pre-Footer Banner
   */
  slotNumber: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function AdBannerSlot({
  slotNumber,
  orientation = "horizontal",
  className,
}: AdBannerSlotProps) {
  const { data: ads } = useQuery({
    queryKey: ["active-ads"],
    queryFn: adsApi.getActiveAds,
    staleTime: 15 * 1000,
    refetchOnMount: true,
  });

  const ad = ads?.[slotNumber];

  // Zero CLS: If slot has no active ad, collapse cleanly without taking space
  if (!ad || !ad.is_active || !ad.media_url) {
    return null;
  }

  const isVertical = orientation === "vertical" || slotNumber === 1 || slotNumber === 2;

  const handleClick = () => {
    adsApi.recordClick(slotNumber);
  };

  const rawUrl = ad.media_url || "";
  const displayUrl = rawUrl.replace(/^https?:\/\/[^/]+(?::\d+)?(\/api\/v1\/files\/download\/)/i, "$1");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-300 hover:border-primary/40 hover:shadow-md",
        isVertical
          ? "w-full min-h-[500px] max-h-[620px] flex flex-col justify-between"
          : "w-full h-[140px] md:h-[180px]",
        className
      )}
    >
      {/* Media: Video or Image */}
      {ad.media_type === "video" ? (
        <video
          src={displayUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={ad.headline || ad.slot_name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      )}

      {/* Subtle Top Badge */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full border border-black/10 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md dark:border-white/10">
        <Sparkles className="h-2.5 w-2.5 text-amber-400" />
        <span>{ad.badge_text || "Featured"}</span>
      </div>

      {/* Hover Headline & CTA Bar */}
      {ad.headline && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 text-white backdrop-blur-[2px] transition-opacity duration-200">
          <p className="line-clamp-1 text-xs font-semibold drop-shadow-sm">
            {ad.headline}
          </p>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-transform group-hover:translate-x-0.5">
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      )}

      {/* Click-through Anchor */}
      <a
        href={ad.target_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title={ad.headline || "Visit Sponsor"}
        className="absolute inset-0 z-30 cursor-pointer"
        aria-label={ad.headline || "Promoted link"}
      />
    </div>
  );
}
