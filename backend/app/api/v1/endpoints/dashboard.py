"""Dashboard aggregate stats for the current user."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DB
from app.models.job import Job
from app.models.file import File

router = APIRouter()


class DashboardStats(BaseModel):
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    pending_jobs: int
    total_files: int
    jobs_by_tool: dict[str, int]


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: CurrentUser, db: DB):
    """Return aggregate processing statistics for the authenticated user."""
    uid = current_user.id

    # Job counts by status
    status_rows = await db.execute(
        select(Job.status, func.count(Job.id))
        .where(Job.owner_id == uid)
        .group_by(Job.status)
    )
    status_map: dict[str, int] = {row[0]: row[1] for row in status_rows}

    # Jobs per tool
    tool_rows = await db.execute(
        select(Job.tool, func.count(Job.id))
        .where(Job.owner_id == uid)
        .group_by(Job.tool)
    )
    jobs_by_tool: dict[str, int] = {row[0]: row[1] for row in tool_rows}

    # Total files
    file_count_result = await db.execute(
        select(func.count(File.id)).where(File.owner_id == uid)
    )
    total_files = file_count_result.scalar_one_or_none() or 0

    total_jobs = sum(status_map.values())

    return DashboardStats(
        total_jobs=total_jobs,
        completed_jobs=status_map.get("completed", 0),
        failed_jobs=status_map.get("failed", 0),
        pending_jobs=status_map.get("pending", 0) + status_map.get("processing", 0),
        total_files=total_files,
        jobs_by_tool=jobs_by_tool,
    )
