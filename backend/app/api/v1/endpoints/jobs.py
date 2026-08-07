"""Job management endpoints."""

import math
import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DB, OptionalUser
from app.repositories.job import JobRepository
from app.schemas.common import PaginatedResponse
from app.schemas.job import JobCreate, JobRead
from app.services.job_service import JobService

router = APIRouter()


@router.post("", response_model=JobRead, status_code=202)
async def create_job(data: JobCreate, db: DB, current_user: OptionalUser = None):
    service = JobService(db)
    job = await service.create_job(data, owner_id=current_user.id if current_user else None)
    return await service.enrich_job_read(job)


@router.get("/{job_id}", response_model=JobRead)
async def get_job(job_id: uuid.UUID, db: DB, current_user: OptionalUser = None):
    service = JobService(db)
    job = await service.get_job(job_id, current_user)
    return await service.enrich_job_read(job)


@router.get("", response_model=PaginatedResponse[JobRead])
async def list_my_jobs(
    current_user: CurrentUser,
    db: DB,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    repo = JobRepository(db)
    count_filters = {"owner_id": current_user.id}
    if status:
        count_filters["status"] = status

    total = await repo.count(**count_filters)
    jobs = await repo.get_user_jobs(
        current_user.id,
        status=status,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    service = JobService(db)
    items = [await service.enrich_job_read(j) for j in jobs]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )
