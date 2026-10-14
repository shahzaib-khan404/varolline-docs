"""
Ad Banner Model — Numbered marketing container slots for company products.
"""

from __future__ import annotations

import uuid
from typing import Optional
from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class AdBanner(Base, TimestampMixin):
    """
    Represents an advertisement or marketing banner assigned to a numbered slot.
    Slot Numbers:
      1: Left Skyscraper (Tool Pages)
      2: Right Skyscraper (Tool Pages)
      3: Top Leaderboard (Tool Pages)
      4: Bottom Anchor (Tool Pages)
      5: Landing Post-Hero Banner
      6: Landing Mid-Page Banner
      7: Landing Pre-Footer Banner
    """
    __tablename__ = "ad_banners"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    slot_number: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
        index=True,
        comment="Explicit slot number (1-7)",
    )

    slot_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        comment="Human-readable slot identifier, e.g. Left Skyscraper",
    )

    media_type: Mapped[str] = mapped_column(
        String(20),
        default="image",
        nullable=False,
        comment="'image' or 'video'",
    )

    media_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Publicly accessible URL to the image or video banner",
    )

    storage_key: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="Internal storage key for deletion/cleanup",
    )

    target_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Destination link when the user clicks the banner",
    )

    headline: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Optional promotional headline",
    )

    badge_text: Mapped[Optional[str]] = mapped_column(
        String(50),
        default="Featured",
        nullable=True,
        comment="Badge tag shown on banner, e.g. 'Featured', 'Sponsored'",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Whether the ad is currently visible in the container slot",
    )

    click_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Total click-through conversions",
    )

    impression_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Total impressions rendered",
    )
