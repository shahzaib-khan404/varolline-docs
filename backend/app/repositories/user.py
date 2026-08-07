"""User-specific repository methods."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        return await self.get_by(email=email)

    async def get_by_google_id(self, google_id: str) -> User | None:
        return await self.get_by(google_id=google_id)

    async def get_by_github_id(self, github_id: str) -> User | None:
        return await self.get_by(github_id=github_id)

    async def email_exists(self, email: str) -> bool:
        return await self.get_by_email(email) is not None
