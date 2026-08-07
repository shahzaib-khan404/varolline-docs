"""File validation utilities."""

import hashlib
from pathlib import Path

from app.core.config import settings
from app.core.exceptions import UnsupportedFileTypeError, FileTooLargeError


def validate_extension(filename: str) -> str:
    """Raise UnsupportedFileTypeError if extension is not allowed. Returns extension."""
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(ext)
    return ext


def validate_size(size_bytes: int) -> None:
    """Raise FileTooLargeError if size exceeds the configured maximum."""
    if size_bytes > settings.max_upload_size_bytes:
        raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)


def sha256_checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_filename(filename: str) -> str:
    """Strip path separators to prevent path traversal."""
    return Path(filename).name.replace("/", "").replace("\\", "")
