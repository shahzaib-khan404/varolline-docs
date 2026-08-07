"""File repository."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.repositories.base import BaseRepository


class FileRepository(BaseRepository[File]):
    def __init__(self, session: AsyncSession):
        super().__init__(File, session)

    async def get_by_owner(
        self, owner_id: UUID, *, offset: int = 0, limit: int = 20
    ) -> list[File]:
        return await self.list(owner_id=owner_id, offset=offset, limit=limit)
