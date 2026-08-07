"""FastAPI dependency functions — shared across all endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.models.user import User
from app.repositories.user import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Decode the JWT and return the current user. Raises 401 if invalid."""
    if not credentials:
        raise UnauthorizedError()
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type.")
        user_id = UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired token.")

    user = await UserRepository(db).get(user_id)
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or deactivated.")
    return user


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Return the current user if authenticated, or None for anonymous requests."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except Exception:
        return None


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_admin:
        raise ForbiddenError("Admin access required.")
    return current_user


# Convenience type aliases for endpoint signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
AdminUser = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]
