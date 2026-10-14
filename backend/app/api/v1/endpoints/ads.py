"""
Public Ad endpoints for high-speed client-side banner rendering.
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.ad_banner import AdBannerRead
from app.services.ad_service import AdService

router = APIRouter()


@router.get("/active", response_model=dict[int, AdBannerRead])
async def get_active_ads(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Fetch all active ads mapped by slot number.
    Returns e.g. {1: AdBannerRead, 3: AdBannerRead, ...}
    Fast and lightweight for embedding across tool and landing pages.
    """
    service = AdService(db)
    return await service.get_active_ads_map()


@router.post("/{slot_number}/click", status_code=status.HTTP_204_NO_CONTENT)
async def track_ad_click(
    slot_number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Record an ad click conversion for marketing ROI tracking."""
    service = AdService(db)
    await service.record_click(slot_number)
