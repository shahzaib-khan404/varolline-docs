"""Authentication service — registration, login, token refresh, OAuth."""

from uuid import UUID
import structlog
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import TokenPair, UserCreate, UserLogin

log = structlog.get_logger(__name__)


DESIGNATED_ADMIN_EMAIL = "saeedmian074@gmail.com"


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def register(self, data: UserCreate) -> User:
        if await self.repo.email_exists(data.email):
            raise ConflictError("An account with this email already exists.")

        is_admin = data.email.strip().lower() == DESIGNATED_ADMIN_EMAIL.lower()
        user = await self.repo.create(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role="admin" if is_admin else "user",
            is_active=True,
            is_verified=True,
        )
        log.info("user_registered", user_id=str(user.id), email=user.email, role=user.role)
        return user

    async def login(self, data: UserLogin) -> TokenPair:
        user = await self.repo.get_by_email(data.email)
        if not user or not user.hashed_password:
            raise UnauthorizedError("Invalid email or password.")
        if not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password.")
        if not user.is_active:
            raise UnauthorizedError("Account is deactivated.")

        # Ensure role integrity for designated admin
        if user.email.strip().lower() == DESIGNATED_ADMIN_EMAIL.lower() and user.role != "admin":
            await self.repo.update(user, role="admin")
            user.role = "admin"
        elif user.email.strip().lower() != DESIGNATED_ADMIN_EMAIL.lower() and user.role == "admin":
            await self.repo.update(user, role="user")
            user.role = "user"

        log.info("user_login", user_id=str(user.id), role=user.role)
        return self._issue_tokens(user)

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedError("Invalid token type.")
            user_id = UUID(payload["sub"]) if isinstance(payload["sub"], str) else payload["sub"]
            user = await self.repo.get(user_id)
        except (JWTError, KeyError, ValueError):
            raise UnauthorizedError("Invalid or expired refresh token.")

        if not user or not user.is_active:
            raise UnauthorizedError("User not found or deactivated.")

        return self._issue_tokens(user)

    async def get_or_create_oauth_user(
        self,
        *,
        email: str,
        full_name: str | None,
        avatar_url: str | None,
        provider: str,
        provider_id: str,
    ) -> User:
        """Find or create a user from an OAuth provider."""
        is_admin = email.strip().lower() == DESIGNATED_ADMIN_EMAIL.lower()
        target_role = "admin" if is_admin else "user"

        user = await self.repo.get_by_email(email)
        if user:
            # Attach OAuth ID if not already stored
            updates = {}
            if provider == "google" and not user.google_id:
                updates["google_id"] = provider_id
            elif provider == "github" and not user.github_id:
                updates["github_id"] = provider_id

            if user.role != target_role:
                updates["role"] = target_role
                user.role = target_role

            if updates:
                await self.repo.update(user, **updates)
            return user

        # Brand-new OAuth user — no password
        create_kwargs: dict = {
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "is_verified": True,  # OAuth accounts are pre-verified
            "role": target_role,
        }
        if provider == "google":
            create_kwargs["google_id"] = provider_id
        elif provider == "github":
            create_kwargs["github_id"] = provider_id

        user = await self.repo.create(**create_kwargs)
        log.info("oauth_user_created", provider=provider, user_id=str(user.id), role=user.role)
        return user

    def _issue_tokens(self, user: User) -> TokenPair:
        return TokenPair(
            access_token=create_access_token(
                str(user.id), extra={"role": user.role, "email": user.email}
            ),
            refresh_token=create_refresh_token(str(user.id)),
        )
