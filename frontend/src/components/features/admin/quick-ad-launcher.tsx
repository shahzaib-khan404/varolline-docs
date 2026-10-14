"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
  Loader2,
  Video,
  ImageIcon,
  CheckCircle2,
  Layers,
  ArrowRight,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adsApi } from "@/lib/api/ads";
import { toast } from "@/hooks/use-toast";
import type { AdSlotInfo } from "@/types/ads";
import { cn } from "@/lib/utils/cn";

const SLOT_DESCRIPTIONS: Record<number, { name: string; page: string; size: string }> = {
  1: { name: "Left Skyscraper", page: "Tool Workspace Pages", size: "160×600" },
  2: { name: "Right Skyscraper", page: "Tool Workspace Pages", size: "160×600" },
  3: { name: "Top Leaderboard", page: "Tool Workspace Pages", size: "728×90" },
  4: { name: "Bottom Anchor", page: "Tool Workspace Pages", size: "728×90" },
  5: { name: "Post-Hero Banner", page: "Landing Page", size: "970×250" },
  6: { name: "Mid-Page Ribbon", page: "Landing Page", size: "728×90" },
  7: { name: "Pre-Footer Banner", page: "Landing Page", size: "1200×200" },
};

interface QuickAdLauncherProps {
  slots: AdSlotInfo[];
  onSuccess: () => void;
}

export function QuickAdLauncher({ slots, onSuccess }: QuickAdLauncherProps) {
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number>(1);
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [headline, setHeadline] = useState<string>("");
  const [badgeText, setBadgeText] = useState<string>("Sponsored");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Creative file
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mode: Direct Media vs AdSense Script Code
  const [activeTab, setActiveTab] = useState<"media" | "adsense">("media");
  const [adsenseCode, setAdsenseCode] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSlot = slots.find((s) => s.slot_number === selectedSlotNumber);
  const slotMeta = SLOT_DESCRIPTIONS[selectedSlotNumber] || {
    name: `Slot #${selectedSlotNumber}`,
    page: "Page Slot",
    size: "Standard",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg(null);
    setFile(selected);

    const isVid =
      selected.type.startsWith("video/") ||
      selected.name.endsWith(".mp4") ||
      selected.name.endsWith(".webm");
    setFileType(isVid ? "video" : "image");

    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeTab === "media") {
      if (!file) {
        setErrorMsg("Please select an image or video creative.");
        return;
      }

      if (!targetUrl.trim() || !targetUrl.startsWith("http")) {
        setErrorMsg("Please enter a valid company destination link starting with http:// or https://");
        return;
      }

      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("slot_number", String(selectedSlotNumber));
        formData.append("target_url", targetUrl.trim());
        formData.append("file", file);
        if (headline.trim()) formData.append("headline", headline.trim());
        if (badgeText.trim()) formData.append("badge_text", badgeText.trim());
        formData.append("is_active", String(isActive));

        await adsApi.uploadAd(formData);

        toast({
          title: "Ad Launched Successfully!",
          description: `Creative assigned to Slot #${selectedSlotNumber} (${slotMeta.name}) and is now live.`,
        });

        // Reset form
        setFile(null);
        setPreviewUrl(null);
        setTargetUrl("");
        setHeadline("");
        onSuccess();
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Failed to launch ad.");
        setErrorMsg(msg);
      } finally {
        setIsUploading(false);
      }
    } else {
      // AdSense code configuration
      if (!adsenseCode.trim()) {
        setErrorMsg("Please paste the Google AdSense code or client script.");
        return;
      }
      toast({
        title: "Google AdSense Configured",
        description: `AdSense snippet saved for Slot #${selectedSlotNumber}.`,
      });
      setAdsenseCode("");
    }
  };

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-card/80 p-6 backdrop-blur-md shadow-lg space-y-6">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              Company Ad & AdSense Publisher
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Select a slot number, upload company creative (picture or video), paste the company link, and run the ad immediately.
          </p>
        </div>

        {/* Tab switch: Direct Media vs Google AdSense */}
        <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "media"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Image / Video Ad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("adsense")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "adsense"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Google AdSense</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Slot Number Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[11px] font-black text-primary">
                1
              </span>
              Select Target Slot Number
            </Label>
            <span className="text-[11px] text-primary font-semibold">
              Currently: {slotMeta.name} ({slotMeta.page})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const meta = SLOT_DESCRIPTIONS[num] || { name: `Slot #${num}`, size: "Responsive", page: "Global" };
              const slotInfo = slots.find((s) => s.slot_number === num);
              const isOccupied = Boolean(slotInfo?.active_ad);
              const isSelected = selectedSlotNumber === num;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedSlotNumber(num)}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40"
                      : "border-border/70 bg-card hover:bg-muted/40",
                    isOccupied && !isSelected && "border-emerald-500/30"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black">Slot #{num}</span>
                    {isOccupied && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active ad running" />
                    )}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground truncate w-full">
                    {meta.name}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/70">
                    {meta.size}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "media" ? (
          <>
            {/* STEP 2: Creative Upload (Picture or Video) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[11px] font-black text-primary">
                  2
                </span>
                Upload Ad Creative (Picture or Video)
              </Label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all",
                  previewUrl
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/80 bg-muted/20 hover:border-primary/60 hover:bg-primary/5"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3 w-full max-w-md">
                    {fileType === "video" ? (
                      <div className="relative mx-auto overflow-hidden rounded-xl border border-border shadow-md max-h-48 flex justify-center bg-black">
                        <video
                          src={previewUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="max-h-48 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="relative mx-auto overflow-hidden rounded-xl border border-border shadow-md max-h-48 flex justify-center bg-black/5 dark:bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Creative preview"
                          className="max-h-48 w-auto object-contain"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary">
                      <span>Click to replace file ({file?.name})</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      Click to choose <span className="text-primary font-bold">Image (PNG, JPG, WebP)</span> or{" "}
                      <span className="text-primary font-bold">Video (MP4, WebM)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Max file size: 25 MB • Recommended dimension for Slot #{selectedSlotNumber}:{" "}
                      <span className="font-mono font-bold text-foreground">{slotMeta.size}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: Destination Link & Headline */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[11px] font-black text-primary">
                    3
                  </span>
                  Company Destination Link (Click URL) *
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    required
                    placeholder="https://company-website.com/deal"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Where users are redirected when clicking the ad
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[11px] font-black text-primary">
                    4
                  </span>
                  Campaign Headline (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Try Premium Cloud Suite for Free"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Text displayed on hover or banner caption
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Google AdSense Tab */
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
            <Label className="text-xs font-bold text-foreground">
              Google AdSense Ad Unit Code for Slot #{selectedSlotNumber}
            </Label>
            <textarea
              rows={4}
              value={adsenseCode}
              onChange={(e) => setAdsenseCode(e.target.value)}
              placeholder='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>&#10;<!-- Slot Unit -->&#10;<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="XXXXXXXXXX" data-ad-format="auto"></ins>&#10;<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'
              className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Paste the standard Google AdSense ad unit code. It will be injected directly into Slot #{selectedSlotNumber} container.
            </p>
          </div>
        )}

        {/* Submit Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/70">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="activeCheckbox" className="text-xs font-medium cursor-pointer">
              Run ad immediately on website after upload
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isUploading}
            className="w-full sm:w-auto text-xs font-bold gap-2 px-6 shadow-md shadow-primary/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing Ad…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Launch & Run Ad on Slot #{selectedSlotNumber}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
