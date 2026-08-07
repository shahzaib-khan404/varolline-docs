"""Job orchestration service — creates jobs and dispatches to Celery."""

from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.storage import storage
from app.models.job import Job
from app.models.user import User
from app.repositories.file import FileRepository
from app.repositories.job import JobRepository
from app.schemas.job import JobCreate, JobRead, JobStatusUpdate

log = structlog.get_logger(__name__)


class JobService:
    def __init__(self, session: AsyncSession):
        self.job_repo = JobRepository(session)
        self.file_repo = FileRepository(session)

    async def create_job(self, data: JobCreate, owner_id: UUID | None = None) -> Job:
        input_file = await self.file_repo.get(data.input_file_id)
        if not input_file:
            raise NotFoundError("Input file")

        job = await self.job_repo.create(
            tool=data.tool,
            input_file_id=data.input_file_id,
            owner_id=owner_id,
            options=data.options,
            status="pending",
        )

        # Dispatch to Celery — imported here to avoid circular import at module load
        from app.workers.tasks import dispatch_job
        task = dispatch_job.delay(str(job.id))
        await self.job_repo.update(job, celery_task_id=task.id)

        log.info("job_created", job_id=str(job.id), tool=data.tool)
        return job

    async def get_job(self, job_id: UUID, requesting_user: User | None) -> Job:
        job = await self.job_repo.get(job_id)
        if not job:
            raise NotFoundError("Job")
        if requesting_user is None:
            # Anonymous users can only access ownerless (guest) jobs
            if job.owner_id is not None:
                raise ForbiddenError()
        elif not requesting_user.is_admin and job.owner_id != requesting_user.id:
            raise ForbiddenError()
        return job

    async def update_status(self, job_id: UUID, update: JobStatusUpdate) -> Job:
        """Called by Celery workers to report progress."""
        job = await self.job_repo.get(job_id)
        if not job:
            raise NotFoundError("Job")
        return await self.job_repo.update(job, **update.model_dump(exclude_none=True))

    async def enrich_job_read(self, job: Job) -> JobRead:
        """Adds a signed download URL to a job DTO."""
        read = JobRead.model_validate(job)
        if job.output_storage_key:
            read.output_url = storage.get_url(job.output_storage_key)
        return read
