"""Job DTOs."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


ProcessingTool = Literal[
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
    "organize_pdf",
    "page_numbers",
    "unlock_pdf",
    "crop_pdf",
    "repair_pdf",
    "powerpoint_to_pdf",
    "excel_to_pdf",
    "pdf_to_excel",
    "html_to_pdf",
    "pdf_to_pdfa",
    "edit_pdf",
    "sign_pdf",
    "redact_pdf",
    "pdf_forms",
    "ocr_pdf",
    "compare_pdf",
]

JobStatus = Literal["pending", "processing", "completed", "failed", "cancelled"]


class JobCreate(BaseModel):
    tool: ProcessingTool
    input_file_id: uuid.UUID
    options: dict[str, Any] | None = None


class JobStatusUpdate(BaseModel):
    status: JobStatus
    progress: int | None = None
    output_storage_key: str | None = None
    output_filename: str | None = None
    output_size_bytes: int | None = None
    error_message: str | None = None
    celery_task_id: str | None = None


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tool: str
    status: str
    progress: int
    options: dict[str, Any] | None
    output_filename: str | None
    output_url: str | None = None  # Populated by service layer
    output_size_bytes: int | None = None
    input_file_size_bytes: int | None = None
    input_filename: str | None = None
    error_message: str | None
    retry_count: int
    created_at: datetime
    updated_at: datetime
