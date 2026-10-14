"""Storage abstraction — swappable between local, S3, and Cloudflare R2."""

import abc
import asyncio
import uuid
from pathlib import Path

import aiofiles
import boto3
import structlog
from botocore.exceptions import ClientError

from app.core.config import settings

log = structlog.get_logger(__name__)


class StorageBackend(abc.ABC):
    """Abstract storage interface — all backends must implement these methods."""

    @abc.abstractmethod
    async def save(self, data: bytes, filename: str, folder: str = "temp") -> str:
        """Persist bytes and return a storage key/path."""

    @abc.abstractmethod
    async def save_file_stream(self, file_obj, filename: str, folder: str = "temp") -> tuple[str, int, str]:
        """Stream chunks from an UploadFile/file-like object directly to disk to minimize memory usage.
        Returns (storage_key, total_bytes, sha256_checksum)."""

    @abc.abstractmethod
    async def load(self, key: str) -> bytes:
        """Load file bytes by storage key."""

    @abc.abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a file by storage key."""

    @abc.abstractmethod
    def get_url(self, key: str) -> str:
        """Return a publicly accessible URL for a storage key."""

    @abc.abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a key exists in storage."""


class LocalStorage(StorageBackend):
    """Stores files on the local filesystem — for development only."""

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, data: bytes, filename: str, folder: str = "temp") -> str:
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        dest = (self.base_dir / folder / unique_name).resolve()
        dest.parent.mkdir(parents=True, exist_ok=True)
        # Use asyncio thread executor to write synchronously and avoid Windows aiofiles Errno 22 path issues
        loop = asyncio.get_running_loop()
        def _write():
            with open(dest, "wb") as f:
                f.write(data)
        await loop.run_in_executor(None, _write)
        key = f"{folder}/{unique_name}"
        log.debug("local_storage_saved", key=key, bytes=len(data))
        return key

    async def save_file_stream(self, file_obj, filename: str, folder: str = "temp") -> tuple[str, int, str]:
        """Stream chunks (e.g. 1MB) directly to disk without loading whole file in RAM."""
        import hashlib
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        dest = (self.base_dir / folder / unique_name).resolve()
        dest.parent.mkdir(parents=True, exist_ok=True)

        sha256 = hashlib.sha256()
        total_bytes = 0
        chunk_size = 1024 * 1024  # 1MB buffer

        # Open file in executor or direct chunk write
        with open(dest, "wb") as out_file:
            while True:
                chunk = await file_obj.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > settings.max_upload_size_bytes:
                    out_file.close()
                    if dest.exists():
                        dest.unlink()
                    from app.core.exceptions import FileTooLargeError
                    raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)
                sha256.update(chunk)
                out_file.write(chunk)

        key = f"{folder}/{unique_name}"
        checksum = sha256.hexdigest()
        log.info("local_storage_stream_saved", key=key, bytes=total_bytes)
        return key, total_bytes, checksum

    async def load(self, key: str) -> bytes:
        clean_key = key.replace("\\", "/").strip("/")
        path = (self.base_dir / clean_key).resolve()
        loop = asyncio.get_running_loop()
        def _read():
            with open(path, "rb") as f:
                return f.read()
        return await loop.run_in_executor(None, _read)

    async def delete(self, key: str) -> None:
        path = self.base_dir / key
        if path.exists():
            path.unlink()
            log.debug("local_storage_deleted", key=key)

    def get_url(self, key: str, expires_in_seconds: int = 1800) -> str:
        clean_key = key.replace("\\", "/").strip("/")
        from urllib.parse import quote
        from app.core.security import create_download_token
        token, expires = create_download_token(clean_key, expires_in_seconds)
        quoted_key = quote(clean_key, safe="/")
        return f"{settings.BACKEND_URL}/api/v1/files/download/{quoted_key}?token={token}&expires={expires}"

    async def exists(self, key: str) -> bool:
        return (self.base_dir / key).exists()


class S3Storage(StorageBackend):
    """Stores files in AWS S3. Compatible with Cloudflare R2."""

    def __init__(self):
        kwargs = dict(
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or settings.R2_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        if settings.STORAGE_BACKEND == "r2" and settings.R2_ENDPOINT:
            kwargs["endpoint_url"] = settings.R2_ENDPOINT

        self.client = boto3.client("s3", **kwargs)
        self.bucket = settings.AWS_S3_BUCKET or settings.R2_BUCKET

    async def save(self, data: bytes, filename: str, folder: str = "temp") -> str:
        key = f"{folder}/{uuid.uuid4().hex}_{filename}"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    async def save_file_stream(self, file_obj, filename: str, folder: str = "temp") -> tuple[str, int, str]:
        import hashlib
        key = f"{folder}/{uuid.uuid4().hex}_{filename}"
        data = await file_obj.read()
        sha256 = hashlib.sha256(data).hexdigest()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key, len(data), sha256

    async def load(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    async def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def get_url(self, key: str) -> str:
        if settings.STORAGE_BACKEND == "r2" and settings.R2_ENDPOINT:
            return f"{settings.R2_ENDPOINT}/{self.bucket}/{key}"
        return f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

    async def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False


def get_storage() -> StorageBackend:
    """Factory — returns the configured storage backend."""
    if settings.STORAGE_BACKEND == "local":
        return LocalStorage(settings.LOCAL_UPLOAD_DIR)
    return S3Storage()


# Module-level singleton
storage: StorageBackend = get_storage()
