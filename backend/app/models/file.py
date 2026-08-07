"""File model — tracks every uploaded file."""

import uuid

from sqlalchemy import BigInteger, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class File(Base, TimestampMixin):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(256), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(64))  # SHA-256 hex

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="files")  # noqa: F821
    jobs: Mapped[list["Job"]] = relationship(  # noqa: F821
        "Job", back_populates="input_file", foreign_keys="Job.input_file_id"
    )

    def __repr__(self) -> str:
        return f"<File id={self.id} name={self.original_filename}>"
