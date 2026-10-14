"""
Pydantic schemas for Ad Banner management and slot rendering.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


# Supported standard slot numbers and definitions
STANDARD_SLOTS = [
    {
        "slot_number": 1,
        "name": "Left Skyscraper",
        "placement": "Tool Pages (Left Gutter)",
        "orientation": "vertical",
        "suggested_size": "160x600 / 300x600",
    },
    {
        "slot_number": 2,
        "name": "Right Skyscraper",
        "placement": "Tool Pages (Right Gutter)",
        "orientation": "vertical",
        "suggested_size": "160x600 / 300x600",
    },
    {
        "slot_number": 3,
        "name": "Top Leaderboard",
        "placement": "Tool Pages (Header Top)",
        "orientation": "horizontal",
        "suggested_size": "728x90 / 970x90",
    },
    {
        "slot_number": 4,
        "name": "Bottom Anchor",
        "placement": "Tool Pages (Below Tool)",
        "orientation": "horizontal",
        "suggested_size": "728x90 / 970x90",
    },
    {
        "slot_number": 5,
        "name": "Landing Post-Hero Banner",
        "placement": "Landing Page (Below Hero)",
        "orientation": "horizontal",
        "suggested_size": "1200x200 / 970x250",
    },
    {
        "slot_number": 6,
        "name": "Landing Mid-Page Banner",
        "placement": "Landing Page (Below Tools Grid)",
        "orientation": "horizontal",
        "suggested_size": "1200x250",
    },
    {
        "slot_number": 7,
        "name": "Landing Pre-Footer Banner",
        "placement": "Landing Page (Above Footer)",
        "orientation": "horizontal",
        "suggested_size": "1200x200",
    },
]


class AdBannerBase(BaseModel):
    slot_number: int = Field(..., ge=1, le=20, description="Container slot number (1-7)")
    slot_name: str = Field(..., max_length=120)
    media_type: Literal["image", "video"] = "image"
    media_url: str = Field(..., max_length=500)
    target_url: str = Field(..., max_length=500, description="Click destination URL")
    headline: Optional[str] = Field(None, max_length=255)
    badge_text: Optional[str] = Field("Featured", max_length=50)
    is_active: bool = True


class AdBannerCreate(BaseModel):
    slot_number: int = Field(..., ge=1, le=20)
    slot_name: Optional[str] = None
    target_url: str
    headline: Optional[str] = None
    badge_text: Optional[str] = "Featured"
    is_active: bool = True


class AdBannerUpdate(BaseModel):
    target_url: Optional[str] = None
    headline: Optional[str] = None
    badge_text: Optional[str] = None
    is_active: Optional[bool] = None


class AdBannerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slot_number: int
    slot_name: str
    media_type: str
    media_url: str
    target_url: str
    headline: Optional[str] = None
    badge_text: Optional[str] = "Featured"
    is_active: bool
    click_count: int = 0
    impression_count: int = 0
    created_at: datetime
    updated_at: datetime


class AdSlotInfo(BaseModel):
    slot_number: int
    name: str
    placement: str
    orientation: str
    suggested_size: str
    active_ad: Optional[AdBannerRead] = None
