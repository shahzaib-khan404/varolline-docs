"""User profile service."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserUpdate


class UserService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def get_by_id(self, user_id: UUID) -> User:
        user = await self.repo.get(user_id)
        if not user:
            raise NotFoundError("User")
        return user

    async def update_profile(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        return await self.repo.update(user, **data.model_dump(exclude_none=True))

    async def deactivate(self, user_id: UUID) -> User:
        user = await self.get_by_id(user_id)
        return await self.repo.update(user, is_active=False)
