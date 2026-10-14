"""File upload service — validation, storage, and metadata persistence."""

import hashlib
import mimetypes
from uuid import UUID

import magic
import structlog
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import FileTooLargeError, UnsupportedFileTypeError
from app.core.file_validator import sanitize_filename
from app.core.storage import storage
from app.models.file import File
from app.repositories.file import FileRepository
from app.schemas.file import FileCreate

log = structlog.get_logger(__name__)

CHUNK_SIZE = 1024 * 256  # 256 KB read chunks


class FileService:
    def __init__(self, session: AsyncSession):
        self.repo = FileRepository(session)

    async def upload(
        self, upload: UploadFile, *, owner_id: UUID | None = None
    ) -> File:
        raw_name = (upload.filename or "upload").strip()
        safe_name = sanitize_filename(raw_name)

        # Extension allowlist (fast-fail before reading file content)
        ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise UnsupportedFileTypeError(f".{ext}")

        # Stream directly to storage/disk — 0 MB excess RAM load even for large files
        storage_key, total_bytes, checksum = await storage.save_file_stream(
            upload, safe_name, folder="originals"
        )

        if total_bytes == 0:
            from fastapi import HTTPException
            await storage.delete(storage_key)
            raise HTTPException(400, detail="Uploaded file is empty.")

        # Read first 4KB to verify MIME type from file on disk without reading whole file
        mime_header = b""
        try:
            if settings.STORAGE_BACKEND == "local":
                with open((settings.LOCAL_UPLOAD_DIR / storage_key).resolve(), "rb") as f:
                    mime_header = f.read(4096)
            else:
                mime_header = (await storage.load(storage_key))[:4096]
        except Exception:
            pass

        mime_type = self._detect_mime(mime_header, ext=ext, declared_mime=upload.content_type)
        if mime_type not in settings.ALLOWED_MIME_TYPES:
            await storage.delete(storage_key)
            raise UnsupportedFileTypeError(mime_type)

        file = await self.repo.create(
            original_filename=safe_name,
            storage_key=storage_key,
            mime_type=mime_type,
            size_bytes=total_bytes,
            checksum=checksum,
            owner_id=owner_id,
        )
        log.info("file_stream_uploaded", file_id=str(file.id), size=total_bytes, mime=mime_type)
        return file

    async def upload_bytes(
        self,
        data: bytes,
        filename: str,
        *,
        declared_mime: str | None = None,
        owner_id: UUID | None = None,
    ) -> File:
        if not data:
            from fastapi import HTTPException
            raise HTTPException(400, detail="File content is empty.")

        if len(data) > settings.max_upload_size_bytes:
            raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)

        safe_name = sanitize_filename(filename.strip() or "upload.pdf")
        ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            safe_name = f"{safe_name}.pdf"
            ext = "pdf"

        mime_type = self._detect_mime(data, ext=ext, declared_mime=declared_mime)
        if mime_type not in settings.ALLOWED_MIME_TYPES:
            raise UnsupportedFileTypeError(mime_type)

        checksum = hashlib.sha256(data).hexdigest()
        storage_key = await storage.save(data, safe_name, folder="originals")

        file = await self.repo.create(
            original_filename=safe_name,
            storage_key=storage_key,
            mime_type=mime_type,
            size_bytes=len(data),
            checksum=checksum,
            owner_id=owner_id,
        )
        log.info("file_bytes_uploaded", file_id=str(file.id), size=len(data), mime=mime_type)
        return file

    async def get_download_url(self, file: File) -> str:
        return storage.get_url(file.storage_key)

    @staticmethod
    def _detect_mime(data: bytes, ext: str = "", declared_mime: str | None = None) -> str:
        """Use libmagic to detect MIME, with fallback for OpenXML/binary formats on Windows."""
        detected = ""
        try:
            detected = magic.from_buffer(data[:4096], mime=True)
        except Exception:
            detected = ""

        # Fallback for OpenXML (DOCX, XLSX, PPTX) and binary formats when libmagic
        # detects generic/unsupported types on Windows.
        if detected not in settings.ALLOWED_MIME_TYPES:
            if ext == "docx" and data.startswith(b"PK\x03\x04"):
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif ext == "xlsx" and data.startswith(b"PK\x03\x04"):
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            elif ext == "pptx" and data.startswith(b"PK\x03\x04"):
                return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            elif ext == "ppt" and data.startswith(b"\xd0\xcf\x11\xe0"):
                return "application/vnd.ms-powerpoint"
            elif ext == "xls" and data.startswith(b"\xd0\xcf\x11\xe0"):
                return "application/vnd.ms-excel"
            elif ext == "csv" or (ext in ("html", "htm") and b"<" in data[:512]):
                return "text/html" if ext in ("html", "htm") else "text/csv"
            elif ext == "doc" and data.startswith(b"\xd0\xcf\x11\xe0"):
                return "application/msword"
            elif ext == "pdf" and data.startswith(b"%PDF"):
                return "application/pdf"
            elif ext in ("jpg", "jpeg") and data.startswith(b"\xff\xd8\xff"):
                return "image/jpeg"
            elif ext == "png" and data.startswith(b"\x89PNG"):
                return "image/png"

            if declared_mime:
                clean_declared = declared_mime.split(";")[0].strip().lower()
                if clean_declared in settings.ALLOWED_MIME_TYPES:
                    return clean_declared

        return detected

    @staticmethod
    async def _iter_chunks(upload: UploadFile):
        while True:
            chunk = await upload.read(CHUNK_SIZE)
            if not chunk:
                break
            yield chunk
