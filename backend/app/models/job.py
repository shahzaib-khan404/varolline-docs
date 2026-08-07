"""Processing job model — tracks every document processing task."""

import uuid
from typing import Any

from sqlalchemy import BigInteger, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    input_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("files.id", ondelete="SET NULL")
    )

    # Celery task reference
    celery_task_id: Mapped[str | None] = mapped_column(String(256), index=True)

    tool: Mapped[str] = mapped_column(
        Enum(
            "merge_pdf",
            "split_pdf",
            "compress_pdf",
            "pdf_to_image",
            "image_to_pdf",
            "pdf_to_word",
            "word_to_pdf",
            "rotate_pdf",
            "delete_pages",
            "watermark_pdf",
            "password_protect",
            "ocr_extraction",
            name="processing_tool",
        ),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "completed", "failed", "cancelled", name="job_status"),
        default="pending",
        nullable=False,
        index=True,
    )

    # Job configuration passed to the worker
    options: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    # Output
    output_storage_key: Mapped[str | None] = mapped_column(String(1024))
    output_filename: Mapped[str | None] = mapped_column(String(512))
    output_size_bytes: Mapped[int | None] = mapped_column(BigInteger)

    # Progress
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100

    # Error details
    error_message: Mapped[str | None] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="jobs")  # noqa: F821
    input_file: Mapped["File"] = relationship(  # noqa: F821
        "File", back_populates="jobs", foreign_keys=[input_file_id]
    )
    downloads: Mapped[list["Download"]] = relationship(  # noqa: F821
        "Download", back_populates="job"
    )

    def __repr__(self) -> str:
        return f"<Job id={self.id} tool={self.tool} status={self.status}>"

    @property
    def is_complete(self) -> bool:
        return self.status == "completed"

    @property
    def is_failed(self) -> bool:
        return self.status == "failed"
