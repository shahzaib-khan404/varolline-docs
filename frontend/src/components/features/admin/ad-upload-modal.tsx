"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
  Loader2,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdSlotInfo } from "@/types/ads";

interface AdUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: AdSlotInfo[];
  defaultSlotNumber: number;
  onSuccess: () => void;
}

export function AdUploadModal({
  isOpen,
  onClose,
  slots,
  defaultSlotNumber,
  onSuccess,
}: AdUploadModalProps) {
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number>(defaultSlotNumber);
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [headline, setHeadline] = useState<string>("");
  const [badgeText, setBadgeText] = useState<string>("Featured");
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    setSelectedSlotNumber(defaultSlotNumber);
  }, [defaultSlotNumber]);

  // File selection & preview
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentSlot = slots.find((s) => s.slot_number === selectedSlotNumber);
  const isReplacing = Boolean(currentSlot?.active_ad);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg(null);
    setFile(selected);

    const isVid = selected.type.startsWith("video/") || selected.name.endsWith(".mp4") || selected.name.endsWith(".webm");
    setFileType(isVid ? "video" : "image");

    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!file) {
      setErrorMsg("Please select an image or video creative.");
      return;
    }

    if (!targetUrl.trim() || !targetUrl.startsWith("http")) {
      setErrorMsg("Please enter a valid destination link starting with http:// or https://");
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

      const { adsApi } = await import("@/lib/api/ads");
      await adsApi.uploadAd(formData);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Failed to upload ad. Please try again.");
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {isReplacing ? `Replace Ad on Slot #${selectedSlotNumber}` : `Upload New Ad Creative`}
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure banner placement, creative media, and destination click link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Slot Selector Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Ad Container Slot</Label>
            <select
              value={selectedSlotNumber}
              onChange={(e) => setSelectedSlotNumber(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {slots.map((s) => (
                <option key={s.slot_number} value={s.slot_number}>
                  Slot #{s.slot_number} — {s.name} ({s.placement}) {s.active_ad ? "[Occupied]" : "[Empty]"}
                </option>
              ))}
            </select>
          </div>

          {/* Replacement Alert Warning */}
          {isReplacing && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Slot #{selectedSlotNumber} is currently occupied.</strong>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Uploading this new creative will replace the existing ad without interrupting frontend availability.
                </p>
              </div>
            </div>
          )}

          {/* Media File Upload Area */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ad Creative (Image or Video)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-xl border overflow-hidden bg-black/50 aspect-video flex items-center justify-center group">
                {fileType === "video" ? (
                  <video src={previewUrl} autoPlay muted loop className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Ad Preview" className="h-full w-full object-cover" />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    Change File
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer space-y-2"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground">Click to upload Image or Video</p>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP, GIF, MP4, WebM (Max 25 MB)</p>
                </div>
              </button>
            )}
          </div>

          {/* Destination URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3 text-primary" />
              <span>Target Click Link (Required)</span>
            </Label>
            <Input
              type="url"
              required
              placeholder="https://yourcompany.com/product-landing-page"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="text-xs h-9 rounded-xl"
            />
          </div>

          {/* Optional Headline & Badge Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Promotional Headline (Optional)</Label>
              <Input
                placeholder="e.g. Try our Pro Workflow tool"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Badge Tag</span>
              </Label>
              <Input
                placeholder="Featured, Sponsored, Special Offer"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl font-medium">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading}
              className="text-xs min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : isReplacing ? (
                "Save & Replace"
              ) : (
                "Publish Ad"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
