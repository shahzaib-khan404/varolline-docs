"""Application configuration — single source of truth for all settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "Varolline Docs"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    VERSION: str = "1.0.0"

    # ── Security ───────────────────────────────────────────────
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # ── Database ───────────────────────────────────────────────
    DATABASE_URL: str
    DATABASE_URL_SYNC: str = ""
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30

    # ── Redis ──────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ───────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── URLs ───────────────────────────────────────────────────
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # ── OAuth ──────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    OAUTH_STATE_MAX_AGE: int = 600  # 10 minutes

    # ── Storage ────────────────────────────────────────────────
    STORAGE_BACKEND: Literal["local", "s3", "r2"] = "local"
    LOCAL_UPLOAD_DIR: Path = Path("./uploads")

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"

    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = ""
    R2_ENDPOINT: str = ""

    # ── File Limits ────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 100
    TEMP_FILE_TTL_HOURS: int = 24

    ALLOWED_EXTENSIONS: frozenset[str] = frozenset(
        {"pdf", "docx", "doc", "jpg", "jpeg", "png", "pptx", "xlsx"}
    )
    ALLOWED_MIME_TYPES: frozenset[str] = frozenset({
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/jpeg",
        "image/png",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    # ── Rate Limiting ──────────────────────────────────────────
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds

    # ── Celery ─────────────────────────────────────────────────
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    # ── Monitoring ─────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Email ──────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@varollinedocs.com"

    @model_validator(mode="after")
    def set_derived_fields(self) -> "Settings":
        # Derive Celery URLs from Redis if not explicitly set
        if not self.CELERY_BROKER_URL:
            self.CELERY_BROKER_URL = self.REDIS_URL
        if not self.CELERY_RESULT_BACKEND:
            redis_base = self.REDIS_URL.rsplit("/", 1)[0]
            self.CELERY_RESULT_BACKEND = f"{redis_base}/1"
        # Ensure upload directory exists
        self.LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        (self.LOCAL_UPLOAD_DIR / "temp").mkdir(exist_ok=True)
        (self.LOCAL_UPLOAD_DIR / "processed").mkdir(exist_ok=True)
        (self.LOCAL_UPLOAD_DIR / "originals").mkdir(exist_ok=True)
        return self

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
