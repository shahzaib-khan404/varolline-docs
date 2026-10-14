"""uLovepdf — FastAPI application entry point."""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
import app.models
from app.core.logging import configure_logging
from app.core.middleware import (
    SecurityHeadersMiddleware,
    RequestIDMiddleware,
    RateLimitMiddleware,
)
from app.api.v1.router import api_router
import sentry_sdk

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    configure_logging()

    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.1,
        )

    # Create database tables (Alembic handles migrations in production)
    if settings.ENVIRONMENT == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    # Ensure designated admin exists with correct credentials
    try:
        from app.db.init_db import init_db
        await init_db()
    except Exception as e:
        log.error("init_db_failed", error=str(e))

    log.info("ulovepdf_started", environment=settings.ENVIRONMENT)
    yield

    log.info("ulovepdf_stopping")


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        description="Production-grade document processing platform",
        version="1.0.0",
        docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters: outermost runs first) ──────────
    application.add_middleware(RequestIDMiddleware)
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(RateLimitMiddleware)
    application.add_middleware(GZipMiddleware, minimum_size=1000)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID", "Accept"],
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )

    # ── Routes ────────────────────────────────────────────────────
    application.include_router(api_router, prefix="/api/v1")

    # ── Static file serving (uploads in dev) ─────────────────────
    if settings.STORAGE_BACKEND == "local":
        application.mount(
            "/uploads",
            StaticFiles(directory=str(settings.LOCAL_UPLOAD_DIR)),
            name="uploads",
        )

    return application


app = create_application()
