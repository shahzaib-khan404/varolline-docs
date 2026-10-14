"""Production-grade middleware: security headers, request IDs, rate limiting."""

import time
import uuid
from collections import defaultdict
from threading import Lock

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings

log = structlog.get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attaches a unique X-Request-ID to every request and response."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        response.headers["X-Request-ID"] = request_id
        log.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security-hardening HTTP headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # Uploads and file download/preview endpoints are embedded in our frontend iframe.
        # X-Frame-Options: DENY would block the preview; use CSP frame-ancestors instead.
        if request.url.path.startswith("/uploads/") or "/files/download/" in request.url.path:
            allowed = " ".join(settings.ALLOWED_ORIGINS)
            response.headers["Content-Security-Policy"] = f"frame-ancestors 'self' {allowed}"
            if "x-frame-options" in response.headers:
                del response.headers["x-frame-options"]
        else:
            response.headers["X-Frame-Options"] = "DENY"

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter with per-path overrides.

    Sensitive routes (upload, job creation) have tighter independent limits
    so a burst of uploads cannot consume the general quota.

    In production, replace the in-process dict with a Redis-backed store.
    """

    # (max_requests, window_seconds) keyed by path prefix
    _PATH_LIMITS: dict[str, tuple[int, int]] = {
        "/api/v1/files/upload": (10, 60),   # 10 uploads / minute / IP
        "/api/v1/jobs":         (20, 60),   # 20 job creations / minute / IP
    }

    def __init__(self, app):
        super().__init__(app)
        # Separate bucket per (ip, bucket_key) pair
        self._counts: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _check_limit(self, bucket: str, max_req: int, window: int, now: float) -> tuple[bool, int]:
        """Return (is_limited, remaining). Mutates self._counts."""
        cutoff = now - window
        self._counts[bucket] = [t for t in self._counts[bucket] if t > cutoff]
        if len(self._counts[bucket]) >= max_req:
            return True, 0
        self._counts[bucket].append(now)
        return False, max_req - len(self._counts[bucket])

    async def dispatch(self, request: Request, call_next):
        if request.url.path.endswith("/health"):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        now = time.time()
        path = request.url.path

        with self._lock:
            # ── per-path limit (POST only for job/upload routes) ───────────
            for prefix, (max_req, window) in self._PATH_LIMITS.items():
                if path.startswith(prefix) and request.method == "POST":
                    bucket = f"{client_ip}:{prefix}"
                    limited, _ = self._check_limit(bucket, max_req, window, now)
                    if limited:
                        return JSONResponse(
                            status_code=429,
                            content={"code": "RATE_LIMITED",
                                     "message": f"Too many requests to {prefix}. "
                                                f"Limit: {max_req}/{window}s."},
                            headers={"Retry-After": str(window)},
                        )

            # ── global limit ───────────────────────────────────────────────
            global_bucket = f"{client_ip}:global"
            limited, remaining = self._check_limit(
                global_bucket,
                settings.RATE_LIMIT_REQUESTS,
                settings.RATE_LIMIT_PERIOD,
                now,
            )
            if limited:
                return JSONResponse(
                    status_code=429,
                    content={"code": "RATE_LIMITED", "message": "Too many requests."},
                    headers={"Retry-After": str(settings.RATE_LIMIT_PERIOD)},
                )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_REQUESTS)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
