"""
Authentication endpoints.
- Email/password register, login, token refresh
- Google OAuth 2.0 (authorization code flow)
- GitHub OAuth (authorization code flow)

OAuth flow:
  1. GET /auth/google          â†’ redirect to provider with signed state cookie
  2. Provider redirects back   â†’ GET /auth/google/callback?code=â€¦&state=â€¦
  3. Backend exchanges code    â†’ creates/finds user â†’ issues JWT â†’ redirects to frontend
"""

import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlencode

import httpx
import structlog
from fastapi import APIRouter, Cookie, Request
from fastapi.responses import RedirectResponse
from jose import JWTError

from app.api.deps import DB
from app.core.config import settings
from app.core.exceptions import UnauthorizedError, ValidationError
from app.schemas.user import RefreshRequest, TokenPair, UserCreate, UserLogin, UserRead
from app.services.auth import AuthService

log = structlog.get_logger(__name__)
router = APIRouter()


# â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _sign_state(nonce: str) -> str:
    """HMAC-SHA256 sign a state nonce so we can verify it on callback."""
    payload = f"{nonce}:{int(time.time())}"
    sig = hmac.HMAC(
        settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"{payload}:{sig}"


def _verify_state(signed: str) -> bool:
    """Return True if the state was signed by us and is not expired."""
    try:
        nonce, ts, sig = signed.rsplit(":", 2)
        expected = hmac.HMAC(
            settings.SECRET_KEY.encode(),
            f"{nonce}:{ts}".encode(),
            hashlib.sha256,
        ).hexdigest()
        age = int(time.time()) - int(ts)
        return hmac.compare_digest(sig, expected) and age < settings.OAUTH_STATE_MAX_AGE
    except Exception:
        return False


def _frontend_redirect(tokens: TokenPair, error: str | None = None) -> RedirectResponse:
    if error:
        return RedirectResponse(f"{settings.FRONTEND_URL}/auth/login?error={error}")
    params = urlencode({
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
    })
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?{params}")


# â”€â”€ Email / Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/register", response_model=UserRead, status_code=201)
async def register(data: UserCreate, db: DB):
    """Create a new account with email and password."""
    service = AuthService(db)
    user = await service.register(data)
    return user


@router.post("/login", response_model=TokenPair)
async def login(data: UserLogin, db: DB):
    """Authenticate with email and password, returns JWT pair."""
    service = AuthService(db)
    return await service.login(data)


@router.post("/refresh", response_model=TokenPair)
async def refresh_tokens(data: RefreshRequest, db: DB):
    """Exchange a valid refresh token for a new access + refresh pair."""
    service = AuthService(db)
    return await service.refresh(data.refresh_token)


# â”€â”€ Google OAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/google", include_in_schema=False)
async def google_login():
    """Redirect the browser to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise ValidationError("Google OAuth is not configured on this server.")

    nonce = secrets.token_urlsafe(32)
    state = _sign_state(nonce)

    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/google/callback",
        "scope": "openid email profile",
        "response_type": "code",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    })
    response = RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.OAUTH_STATE_MAX_AGE,
    )
    return response


@router.get("/google/callback", include_in_schema=False)
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    oauth_state: str | None = Cookie(default=None),
    db: DB = None,
):
    """Handle Google's redirect after user authorizes (or denies) access."""
    if error or not code:
        return _frontend_redirect(None, error="google_denied")  # type: ignore[arg-type]

    if not state or not _verify_state(state):
        return _frontend_redirect(None, error="invalid_state")  # type: ignore[arg-type]

    async with httpx.AsyncClient() as client:
        # Exchange authorization code for tokens
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            log.error("google_token_exchange_failed", status=token_resp.status_code)
            return _frontend_redirect(None, error="token_exchange_failed")  # type: ignore[arg-type]

        token_data = token_resp.json()
        id_token = token_data.get("id_token", "")

        # Fetch user info
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        if user_resp.status_code != 200:
            return _frontend_redirect(None, error="userinfo_failed")  # type: ignore[arg-type]

        user_info = user_resp.json()

    service = AuthService(db)
    user = await service.get_or_create_oauth_user(
        email=user_info["email"],
        full_name=user_info.get("name"),
        avatar_url=user_info.get("picture"),
        provider="google",
        provider_id=user_info["sub"],
    )
    tokens = service._issue_tokens(user)
    response = _frontend_redirect(tokens)
    response.delete_cookie("oauth_state")
    return response


# â”€â”€ GitHub OAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/github", include_in_schema=False)
async def github_login():
    """Redirect the browser to GitHub's OAuth consent screen."""
    if not settings.GITHUB_CLIENT_ID:
        raise ValidationError("GitHub OAuth is not configured on this server.")

    nonce = secrets.token_urlsafe(32)
    state = _sign_state(nonce)

    params = urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/github/callback",
        "scope": "read:user user:email",
        "state": state,
    })
    response = RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.OAUTH_STATE_MAX_AGE,
    )
    return response


@router.get("/github/callback", include_in_schema=False)
async def github_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    oauth_state: str | None = Cookie(default=None),
    db: DB = None,
):
    """Handle GitHub's redirect after user authorizes (or denies) access."""
    if error or not code:
        return _frontend_redirect(None, error="github_denied")  # type: ignore[arg-type]

    if not state or not _verify_state(state):
        return _frontend_redirect(None, error="invalid_state")  # type: ignore[arg-type]

    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": f"{settings.BACKEND_URL}/api/v1/auth/github/callback",
            },
        )
        if token_resp.status_code != 200:
            return _frontend_redirect(None, error="token_exchange_failed")  # type: ignore[arg-type]

        access_token = token_resp.json().get("access_token")
        if not access_token:
            return _frontend_redirect(None, error="token_exchange_failed")  # type: ignore[arg-type]

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        }

        # Fetch user profile
        user_resp, email_resp = await asyncio.gather(
            client.get("https://api.github.com/user", headers=headers),
            client.get("https://api.github.com/user/emails", headers=headers),
        )
        profile = user_resp.json()

        # GitHub may hide email â€” fall back to primary verified email
        email = profile.get("email")
        if not email:
            emails = email_resp.json()
            primary = next(
                (e for e in emails if e.get("primary") and e.get("verified")), None
            )
            email = primary["email"] if primary else None

        if not email:
            return _frontend_redirect(None, error="no_email")  # type: ignore[arg-type]

    service = AuthService(db)
    user = await service.get_or_create_oauth_user(
        email=email,
        full_name=profile.get("name"),
        avatar_url=profile.get("avatar_url"),
        provider="github",
        provider_id=str(profile["id"]),
    )
    tokens = service._issue_tokens(user)
    response = _frontend_redirect(tokens)
    response.delete_cookie("oauth_state")
    return response


import asyncio  # noqa: E402 â€” placed at bottom to avoid circular hoisting issues



