"""
Admin endpoints for managing company ad banners, numbered slots, media uploads, and replacements.
"""

from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.ad_banner import AdBannerRead, AdBannerUpdate, AdSlotInfo
from app.services.ad_service import AdService

router = APIRouter()


@router.get("/slots", response_model=list[AdSlotInfo])
async def list_all_ad_slots(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all numbered banner slots (1-7) with their assignment details,
    media preview, and active status.
    """
    service = AdService(db)
    return await service.get_all_slots()


@router.post("/upload", response_model=AdBannerRead, status_code=status.HTTP_201_CREATED)
async def upload_slot_ad(
    slot_number: int = Form(..., ge=1, le=20, description="Container slot number (1-7)"),
    target_url: str = Form(..., description="Destination click URL"),
    file: UploadFile = File(..., description="Ad creative (Image: PNG/JPG/WebP/GIF, or Video: MP4/WebM)"),
    headline: Optional[str] = Form(default=None),
    badge_text: Optional[str] = Form(default="Featured"),
    is_active: bool = Form(default=True),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload an Image or Video creative and assign or replace the ad in the specified slot.
    If an ad already occupies this slot, it is seamlessly replaced with the new media.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Media file is required.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Limit ad size to 25MB (ample for high-res images and 15s webm/mp4 video banners)
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Ad media exceeds 25 MB limit.")

    service = AdService(db)
    try:
        ad = await service.upload_and_assign_ad(
            slot_number=slot_number,
            file_bytes=file_bytes,
            filename=file.filename,
            target_url=target_url,
            headline=headline,
            badge_text=badge_text,
            is_active=is_active,
        )
        return ad
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{slot_number}", response_model=AdBannerRead)
async def update_slot_ad(
    slot_number: int,
    update: AdBannerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update settings (destination link, headline, active status) of an existing slot ad."""
    service = AdService(db)
    try:
        return await service.update_ad(slot_number, update)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{slot_number}", status_code=status.HTTP_200_OK)
async def remove_slot_ad(
    slot_number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Remove the ad from the numbered slot and destroy its media file.
    The slot becomes completely empty and collapses on the frontend.
    """
    service = AdService(db)
    removed = await service.remove_ad(slot_number)
    if not removed:
        raise HTTPException(status_code=404, detail=f"No ad found in slot #{slot_number}")
    return {"status": "success", "message": f"Ad removed from slot #{slot_number}"}
