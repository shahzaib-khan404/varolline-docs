"""Synchronous storage helpers for Celery tasks.

The main storage backend (storage.py) is async (uses aiofiles).
Celery tasks run in regular Python threads, so we provide sync equivalents here.
For local storage: direct Path I/O.
For S3/R2: boto3 is already synchronous.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import boto3
import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)


class _TaskStorage:
    """Synchronous file operations for Celery workers."""

    # ── Load ──────────────────────────────────────────────────────────────────

    def load(self, storage_key: str) -> bytes:
        """Return file bytes from the configured storage backend."""
        if settings.STORAGE_BACKEND == "local":
            path = settings.LOCAL_UPLOAD_DIR / storage_key
            data = path.read_bytes()
            log.debug("task_storage_load_local", key=storage_key, bytes=len(data))
            return data
        else:
            client = self._s3()
            bucket = settings.AWS_S3_BUCKET or settings.R2_BUCKET
            resp = client.get_object(Bucket=bucket, Key=storage_key)
            data = resp["Body"].read()
            log.debug("task_storage_load_s3", key=storage_key, bytes=len(data))
            return data

    # ── Save ──────────────────────────────────────────────────────────────────

    def save(
        self,
        data: bytes,
        filename: str,
        *,
        folder: str = "processed",
    ) -> str:
        """Persist bytes and return a storage key."""
        from app.core.file_validator import sanitize_filename
        unique_name = f"{uuid.uuid4().hex}_{sanitize_filename(filename)}"

        if settings.STORAGE_BACKEND == "local":
            dest: Path = settings.LOCAL_UPLOAD_DIR / folder / unique_name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            key = f"{folder}/{unique_name}"
            log.debug("task_storage_save_local", key=key, bytes=len(data))
            return key
        else:
            client = self._s3()
            bucket = settings.AWS_S3_BUCKET or settings.R2_BUCKET
            key = f"{folder}/{unique_name}"
            client.put_object(Bucket=bucket, Key=key, Body=data)
            log.debug("task_storage_save_s3", key=key, bytes=len(data))
            return key

    # ── URL ───────────────────────────────────────────────────────────────────

    def get_url(self, storage_key: str) -> str:
        """Return a publicly accessible URL for a storage key."""
        if settings.STORAGE_BACKEND == "local":
            return f"{settings.BACKEND_URL}/uploads/{storage_key}"
        elif settings.STORAGE_BACKEND == "r2" and settings.R2_ENDPOINT:
            return f"{settings.R2_ENDPOINT}/{settings.R2_BUCKET}/{storage_key}"
        else:
            return (
                f"https://{settings.AWS_S3_BUCKET}"
                f".s3.{settings.AWS_REGION}.amazonaws.com/{storage_key}"
            )

    # ── S3 client (lazy, not cached — Celery forks can't share boto3 sessions) ─

    def _s3(self):
        kwargs: dict = dict(
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=(
                settings.AWS_SECRET_ACCESS_KEY or settings.R2_SECRET_ACCESS_KEY
            ),
            region_name=settings.AWS_REGION,
        )
        if settings.STORAGE_BACKEND == "r2" and settings.R2_ENDPOINT:
            kwargs["endpoint_url"] = settings.R2_ENDPOINT
        return boto3.client("s3", **kwargs)


# Module-level singleton — safe to share within a single Celery worker process
task_storage = _TaskStorage()
