/**
 * Ad Banner API methods — Public active ads & Admin slot management.
 */

import { apiClient } from "./client";
import type { AdBanner, AdBannerUpdate, AdSlotInfo } from "@/types/ads";

export const adsApi = {
  /**
   * Fetch all active ads mapped by slot number (e.g. { 1: AdBanner, 3: AdBanner }).
   * Used for zero-latency client-side banner rendering.
   */
  getActiveAds: async (): Promise<Record<number, AdBanner>> => {
    const { data } = await apiClient.get<Record<string, AdBanner>>("/ads/active");
    // Normalize keys to numbers
    const mapped: Record<number, AdBanner> = {};
    for (const [key, val] of Object.entries(data)) {
      mapped[Number(key)] = val;
    }
    return mapped;
  },

  /**
   * Track ad click-through conversion.
   */
  recordClick: async (slotNumber: number): Promise<void> => {
    try {
      await apiClient.post(`/ads/${slotNumber}/click`);
    } catch {
      // Non-blocking beacon
    }
  },

  /**
   * Admin: List all 7 slots with assignment status and current ads.
   */
  getAdminSlots: async (): Promise<AdSlotInfo[]> => {
    const { data } = await apiClient.get<AdSlotInfo[]>("/admin/ads/slots");
    return data;
  },

  /**
   * Admin: Upload image or video creative and set/replace slot ad.
   */
  uploadAd: async (formData: FormData): Promise<AdBanner> => {
    const { data } = await apiClient.post<AdBanner>("/admin/ads/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /**
   * Admin: Update ad properties (destination link, headline, active status).
   */
  updateAd: async (slotNumber: number, update: AdBannerUpdate): Promise<AdBanner> => {
    const { data } = await apiClient.put<AdBanner>(`/admin/ads/${slotNumber}`, update);
    return data;
  },

  /**
   * Admin: Permanently remove ad creative from a slot.
   */
  removeAd: async (slotNumber: number): Promise<void> => {
    await apiClient.delete(`/admin/ads/${slotNumber}`);
  },
};
