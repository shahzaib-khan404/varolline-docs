"""
Admin Operations Dashboard endpoints.
Allows administrators to monitor, filter, inspect, and manage all platform processing jobs across all users.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.models.job import Job

router = APIRouter()


@router.get("")
async def list_admin_operations(
    status: str | None = Query(default=None, description="Filter by job status"),
    tool: str | None = Query(default=None, description="Filter by tool identifier"),
    q: str | None = Query(default=None, description="Search by file name or user email"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Returns all document processing operations across the entire platform.
    Includes aggregate system metrics and paginated job entries.
    """
    # 1. System-wide aggregate stats
    total_jobs_res = await db.execute(select(func.count(Job.id)))
    total_jobs = total_jobs_res.scalar_one_or_none() or 0

    completed_jobs_res = await db.execute(
        select(func.count(Job.id)).where(Job.status == "completed")
    )
    completed_jobs = completed_jobs_res.scalar_one_or_none() or 0

    failed_jobs_res = await db.execute(
        select(func.count(Job.id)).where(Job.status == "failed")
    )
    failed_jobs = failed_jobs_res.scalar_one_or_none() or 0

    processing_jobs_res = await db.execute(
        select(func.count(Job.id)).where(Job.status.in_(["processing", "pending"]))
    )
    processing_jobs = processing_jobs_res.scalar_one_or_none() or 0

    storage_bytes_res = await db.execute(
        select(func.coalesce(func.sum(Job.output_size_bytes), 0))
    )
    total_storage_bytes = storage_bytes_res.scalar_one_or_none() or 0

    success_rate = (
        round((completed_jobs / total_jobs) * 100, 1) if total_jobs > 0 else 100.0
    )

    # 2. Filtered list query
    query = select(Job, User).outerjoin(User, Job.owner_id == User.id)

    if status:
        query = query.where(Job.status == status)
    if tool:
        query = query.where(Job.tool == tool)
    if q:
        query = query.where(
            (Job.output_filename.ilike(f"%{q}%"))
            | (User.email.ilike(f"%{q}%"))
            | (Job.tool.ilike(f"%{q}%"))
        )

    # Count filtered results
    count_subq = query.subquery()
    count_res = await db.execute(select(func.count()).select_from(count_subq))
    filtered_total = count_res.scalar_one_or_none() or 0

    # Paginate and order by newest
    query = query.order_by(desc(Job.created_at)).offset((page - 1) * page_size).limit(page_size)
    results = await db.execute(query)

    items = []
    for job, user in results.all():
        items.append({
            "id": str(job.id),
            "tool": job.tool,
            "tool_name": job.tool.replace("_", " ").replace("-", " ").title(),
            "status": job.status,
            "progress": job.progress,
            "output_filename": job.output_filename or "document.pdf",
            "output_size_bytes": job.output_size_bytes or 0,
            "error_message": job.error_message,
            "retry_count": job.retry_count,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            "user": {
                "id": str(user.id) if user else None,
                "email": user.email if user else "Guest User",
                "full_name": user.full_name if user else None,
                "role": user.role if user else "guest",
            } if user else None,
        })

    return {
        "stats": {
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "processing_jobs": processing_jobs,
            "failed_jobs": failed_jobs,
            "success_rate": success_rate,
            "total_storage_bytes": total_storage_bytes,
        },
        "items": items,
        "total": filtered_total,
        "page": page,
        "page_size": page_size,
        "total_pages": (filtered_total + page_size - 1) // page_size if filtered_total > 0 else 1,
    }


@router.delete("/{job_id}")
async def delete_operation(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Delete a processing job."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    await db.delete(job)
    await db.commit()
    return {"message": "Operation job deleted successfully", "job_id": str(job_id)}


@router.post("/{job_id}/retry")
async def retry_operation(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Retry a failed or stalled processing job."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job.status = "pending"
    job.progress = 0
    job.retry_count += 1
    job.error_message = None
    await db.commit()
    await db.refresh(job)

    return {"message": "Job queued for retry", "job_id": str(job_id), "status": job.status}
