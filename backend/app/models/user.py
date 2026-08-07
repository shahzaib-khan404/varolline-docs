"""User model."""

import uuid

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(256))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    hashed_password: Mapped[str | None] = mapped_column(String(1024))

    # OAuth
    google_id: Mapped[str | None] = mapped_column(String(256), unique=True, index=True)
    github_id: Mapped[str | None] = mapped_column(String(256), unique=True, index=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("user", "admin", name="user_role"), default="user", nullable=False
    )

    # Relationships
    files: Mapped[list["File"]] = relationship(  # noqa: F821
        "File", back_populates="owner", lazy="dynamic"
    )
    jobs: Mapped[list["Job"]] = relationship(  # noqa: F821
        "Job", back_populates="owner", lazy="dynamic"
    )
    activity_logs: Mapped[list["ActivityLog"]] = relationship(  # noqa: F821
        "ActivityLog", back_populates="user", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
