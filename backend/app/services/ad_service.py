"""
Service for Ad Banner business logic, storage, slot replacement and removal.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any, Optional
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.storage import storage
from app.models.ad_banner import AdBanner
from app.schemas.ad_banner import STANDARD_SLOTS, AdBannerRead, AdBannerUpdate, AdSlotInfo

log = structlog.get_logger(__name__)

# Allowed media formats for ads
ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_VIDEO_EXTS = {".mp4", ".webm"}


class AdService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active_ads_map(self) -> dict[int, AdBannerRead]:
        """Return active ads mapped by slot number for fast client rendering."""
        stmt = select(AdBanner).where(AdBanner.is_active == True)
        result = await self.session.execute(stmt)
        ads = result.scalars().all()
        return {ad.slot_number: AdBannerRead.model_validate(ad) for ad in ads}

    async def get_all_slots(self) -> list[AdSlotInfo]:
        """Return all standard numbered slots with their assigned ad if any."""
        stmt = select(AdBanner)
        result = await self.session.execute(stmt)
        existing_ads = {ad.slot_number: ad for ad in result.scalars().all()}

        slot_list: list[AdSlotInfo] = []
        for s in STANDARD_SLOTS:
            s_num = s["slot_number"]
            active_record = existing_ads.get(s_num)
            slot_list.append(
                AdSlotInfo(
                    slot_number=s_num,
                    name=s["name"],
                    placement=s["placement"],
                    orientation=s["orientation"],
                    suggested_size=s["suggested_size"],
                    active_ad=AdBannerRead.model_validate(active_record) if active_record else None,
                )
            )
        return slot_list

    async def get_by_slot(self, slot_number: int) -> Optional[AdBanner]:
        stmt = select(AdBanner).where(AdBanner.slot_number == slot_number)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upload_and_assign_ad(
        self,
        slot_number: int,
        file_bytes: bytes,
        filename: str,
        target_url: str,
        headline: Optional[str] = None,
        badge_text: Optional[str] = "Featured",
        is_active: bool = True,
    ) -> AdBannerRead:
        """Upload image or video creative and set/replace the ad on this slot."""
        ext = Path(filename).suffix.lower()
        if ext in ALLOWED_VIDEO_EXTS:
            media_type = "video"
        elif ext in ALLOWED_IMAGE_EXTS:
            media_type = "image"
        else:
            raise ValueError(f"Unsupported media format '{ext}'. Allowed: images (png, jpg, webp, gif) or videos (mp4, webm).")

        # Slot metadata lookup
        slot_def = next((s for s in STANDARD_SLOTS if s["slot_number"] == slot_number), None)
        slot_name = slot_def["name"] if slot_def else f"Banner Slot #{slot_number}"

        # Save media using storage backend in 'ads' folder
        safe_name = f"ad_slot_{slot_number}_{uuid.uuid4().hex[:8]}{ext}"
        storage_key = await storage.save(file_bytes, safe_name, folder="ads")
        # Ads are public assets and served without expiring HMAC tokens
        media_url = f"{settings.BACKEND_URL}/api/v1/files/download/{storage_key}"

        existing = await self.get_by_slot(slot_number)
        if existing:
            # Replace existing ad: delete old storage key if exists
            if existing.storage_key:
                try:
                    await storage.delete(existing.storage_key)
                except Exception as err:
                    log.warning("failed_to_delete_old_ad_file", error=str(err))

            existing.media_type = media_type
            existing.media_url = media_url
            existing.storage_key = storage_key
            existing.target_url = target_url.strip()
            existing.headline = headline.strip() if headline else None
            existing.badge_text = badge_text.strip() if badge_text else "Featured"
            existing.is_active = is_active
            await self.session.commit()
            await self.session.refresh(existing)
            log.info("ad_replaced", slot_number=slot_number, media_type=media_type)
            return AdBannerRead.model_validate(existing)
        else:
            # Create new ad for slot
            new_ad = AdBanner(
                slot_number=slot_number,
                slot_name=slot_name,
                media_type=media_type,
                media_url=media_url,
                storage_key=storage_key,
                target_url=target_url.strip(),
                headline=headline.strip() if headline else None,
                badge_text=badge_text.strip() if badge_text else "Featured",
                is_active=is_active,
            )
            self.session.add(new_ad)
            await self.session.commit()
            await self.session.refresh(new_ad)
            log.info("ad_created", slot_number=slot_number, media_type=media_type)
            return AdBannerRead.model_validate(new_ad)

    async def update_ad(self, slot_number: int, update: AdBannerUpdate) -> AdBannerRead:
        ad = await self.get_by_slot(slot_number)
        if not ad:
            raise ValueError(f"No ad found in slot #{slot_number}")

        if update.target_url is not None:
            ad.target_url = update.target_url.strip()
        if update.headline is not None:
            ad.headline = update.headline.strip() if update.headline else None
        if update.badge_text is not None:
            ad.badge_text = update.badge_text.strip() if update.badge_text else "Featured"
        if update.is_active is not None:
            ad.is_active = update.is_active

        await self.session.commit()
        await self.session.refresh(ad)
        return AdBannerRead.model_validate(ad)

    async def remove_ad(self, slot_number: int) -> bool:
        """Permanently remove ad from slot and purge physical file."""
        ad = await self.get_by_slot(slot_number)
        if not ad:
            return False

        if ad.storage_key:
            try:
                await storage.delete(ad.storage_key)
            except Exception as err:
                log.warning("failed_to_delete_ad_file", error=str(err))

        await self.session.delete(ad)
        await self.session.commit()
        log.info("ad_removed", slot_number=slot_number)
        return True

    async def record_click(self, slot_number: int) -> None:
        """Increment click count for analytics."""
        ad = await self.get_by_slot(slot_number)
        if ad:
            ad.click_count += 1
            await self.session.commit()
