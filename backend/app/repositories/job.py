"""Job repository."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.repositories.base import BaseRepository


class JobRepository(BaseRepository[Job]):
    def __init__(self, session: AsyncSession):
        super().__init__(Job, session)

    async def get_by_celery_id(self, celery_task_id: str) -> Job | None:
        return await self.get_by(celery_task_id=celery_task_id)

    async def get_user_jobs(
        self,
        owner_id: UUID,
        *,
        status: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[Job]:
        filters = {"owner_id": owner_id}
        if status:
            filters["status"] = status
        return await self.list(
            **filters,
            offset=offset,
            limit=limit,
            order_by=Job.created_at.desc(),
        )
