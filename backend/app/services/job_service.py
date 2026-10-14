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
        self.session = session
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
        # Commit so the task worker/sync session can find the job record immediately
        await self.session.commit()

        # Dispatch to Celery
        from app.workers.tasks import dispatch_job
        try:
            task = dispatch_job.delay(str(job.id))
            job.celery_task_id = getattr(task, "id", None)
        except Exception as exc:
            log.warning("eager_task_exception", job_id=str(job.id), error=str(exc))

        # Refresh so any eager completion changes (status, progress, output_storage_key) are reflected
        try:
            await self.session.refresh(job)
            await self.session.commit()
        except Exception:
            pass

        log.info("job_created", job_id=str(job.id), tool=data.tool, status=job.status)
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
        """Adds signed download URL and input file details to a job DTO."""
        read = JobRead.model_validate(job)
        if job.output_storage_key:
            read.output_url = storage.get_url(job.output_storage_key)

        if job.input_file_id:
            input_file = await self.file_repo.get(job.input_file_id)
            if input_file:
                total_input_size = input_file.size_bytes
                additional_ids = (job.options or {}).get("additional_file_ids", [])
                for add_id in additional_ids:
                    try:
                        add_f = await self.file_repo.get(UUID(str(add_id)))
                        if add_f:
                            total_input_size += add_f.size_bytes
                    except Exception:
                        pass
                read.input_file_size_bytes = total_input_size
                read.input_filename = input_file.original_filename
        return read
