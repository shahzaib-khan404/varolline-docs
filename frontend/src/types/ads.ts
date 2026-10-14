export interface AdBanner {
  id: string;
  slot_number: number;
  slot_name: string;
  media_type: "image" | "video";
  media_url: string;
  target_url: string;
  headline?: string | null;
  badge_text?: string | null;
  is_active: boolean;
  click_count: number;
  impression_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdSlotInfo {
  slot_number: number;
  name: string;
  placement: string;
  orientation: "horizontal" | "vertical";
  suggested_size: string;
  active_ad?: AdBanner | null;
}

export interface AdBannerUpdate {
  target_url?: string;
  headline?: string | null;
  badge_text?: string | null;
  is_active?: boolean;
}
