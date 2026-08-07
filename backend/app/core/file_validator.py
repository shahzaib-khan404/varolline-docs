"""
Centralised file validation: size, extension, MIME type, and magic bytes.

All checks raise ``fastapi.HTTPException`` so they can be called directly
from endpoint handlers without extra try/except wrappers.
"""

from __future__ import annotations

import re

from fastapi import HTTPException, UploadFile

from app.core.config import settings

# ---------------------------------------------------------------------------
# Magic-byte signatures (first N bytes → expected prefix)
# ---------------------------------------------------------------------------
_MAGIC: dict[str, bytes] = {
    "application/pdf": b"%PDF",
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG",
    # DOCX / XLSX / PPTX are ZIP archives
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": b"PK\x03\x04",
    # Legacy DOC (MS Compound File Binary)
    "application/msword": b"\xd0\xcf\x11\xe0",
}

# Extension → canonical MIME type (used when browser sends a wrong content-type)
_EXT_MIME: dict[str, str] = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
}

# Characters not allowed in filenames (path traversal, shell injection, …)
_UNSAFE_CHARS = re.compile(r'[^\w\s.\-]', re.UNICODE)


async def validate_upload(file: UploadFile) -> bytes:
    """
    Validate *file* and return its complete content as ``bytes``.

    Checks (in order):
      1. Filename is present and extension is in the allowlist
      2. Content-Type is in the allowlist
      3. File size is within ``MAX_UPLOAD_SIZE_MB``
      4. Magic bytes match the declared type (prevents MIME spoofing)

    Raises ``HTTPException`` on any violation.
    """
    # ── 1. Filename / extension ──────────────────────────────────────────────
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(400, detail="Filename is required.")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            415,
            detail=f"File type '.{ext}' is not supported. "
                   f"Allowed: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}.",
        )

    # ── 2. Content-Type ──────────────────────────────────────────────────────
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    # Some browsers send "application/octet-stream" for binary files —
    # fall back to the extension-derived MIME type in that case.
    if content_type == "application/octet-stream":
        content_type = _EXT_MIME.get(ext, content_type)

    if content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            415,
            detail=f"MIME type '{content_type}' is not supported.",
        )

    # ── 3. Size (streaming read with hard limit) ─────────────────────────────
    max_bytes = settings.max_upload_size_bytes
    # Read one byte beyond the limit so we can detect overflow without buffering all.
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            413,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
        )
    if len(content) == 0:
        raise HTTPException(400, detail="Uploaded file is empty.")

    # ── 4. Magic bytes (anti-spoofing) ───────────────────────────────────────
    expected_magic = _MAGIC.get(content_type)
    if expected_magic and not content.startswith(expected_magic):
        raise HTTPException(
            415,
            detail="File content does not match its declared type.",
        )

    return content


def sanitize_filename(name: str) -> str:
    """
    Return a safe filename, stripping path separators and shell-special characters.
    The extension is preserved; the stem is cleaned.
    """
    if not name:
        return "file"

    # Remove directory components
    name = name.replace("\\", "/").split("/")[-1]

    # Split stem and extension
    if "." in name:
        stem, _, ext = name.rpartition(".")
        ext = _UNSAFE_CHARS.sub("", ext)[:16]
    else:
        stem, ext = name, ""

    # Clean the stem
    stem = _UNSAFE_CHARS.sub("_", stem).strip("._- ")[:120]
    if not stem:
        stem = "file"

    return f"{stem}.{ext}" if ext else stem
