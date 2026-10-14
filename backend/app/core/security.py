"""JWT creation/verification and password hashing."""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str | Any, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "type": "access",
        **(extra or {}),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str | Any) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def create_download_token(storage_key: str, expires_in_seconds: int = 1800) -> tuple[str, int]:
    """
    Generate a cryptographic HMAC-SHA256 token for secure, temporary file downloads.
    Valid for expires_in_seconds (default: 30 minutes).
    """
    import hmac
    import hashlib
    import time

    expires = int(time.time()) + expires_in_seconds
    # Normalize key to forward slashes to prevent OS-specific path differences
    clean_key = storage_key.replace("\\", "/").strip("/")
    message = f"{clean_key}:{expires}".encode("utf-8")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return sig, expires


def verify_download_token(storage_key: str, token: str, expires: int) -> bool:
    """
    Verify HMAC-SHA256 download token using constant-time comparison.
    Rejects expired tokens or mismatched storage keys.
    """
    import hmac
    import hashlib
    import time

    if int(time.time()) > expires:
        return False

    clean_key = storage_key.replace("\\", "/").strip("/")
    message = f"{clean_key}:{expires}".encode("utf-8")
    expected = hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(token, expected)
