"""File DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileCreate(BaseModel):
    original_filename: str
    storage_key: str
    mime_type: str
    size_bytes: int
    checksum: str | None = None
    owner_id: uuid.UUID | None = None


class FileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    mime_type: str
    size_bytes: int
    url: str = ""  # Populated by service layer
    created_at: datetime
