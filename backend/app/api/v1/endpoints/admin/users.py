"""
Admin User Management endpoints.
Allows administrators to view, search, promote/demote, and manage all registered user accounts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.models.job import Job

router = APIRouter()


class RoleUpdateRequest(BaseModel):
    role: str  # "admin" | "user"


class StatusUpdateRequest(BaseModel):
    is_active: bool


@router.get("")
async def list_admin_users(
    q: str | None = Query(default=None, description="Search by email or name"),
    role: str | None = Query(default=None, description="Filter by role: admin or user"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """List all registered users from database with job counts and activity metrics."""
    query = select(User)

    if q:
        query = query.where(
            (User.email.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%"))
        )
    if role:
        query = query.where(User.role == role)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar_one_or_none() or 0

    # Paginate
    query = query.order_by(desc(User.created_at)).offset((page - 1) * page_size).limit(page_size)
    users_result = await db.execute(query)
    users = users_result.scalars().all()

    # Get job counts per user
    user_ids = [u.id for u in users]
    job_counts: dict[uuid.UUID, int] = {}
    if user_ids:
        job_counts_res = await db.execute(
            select(Job.owner_id, func.count(Job.id))
            .where(Job.owner_id.in_(user_ids))
            .group_by(Job.owner_id)
        )
        job_counts = {row[0]: row[1] for row in job_counts_res}

    items = [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name or u.email.split("@")[0],
            "role": u.role,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "provider": "Google SSO" if u.google_id else "Email / Password",
            "jobs_count": job_counts.get(u.id, 0),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "is_current_admin": u.id == admin_user.id,
        }
        for u in users
    ]

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1,
    }


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    payload: RoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Change a user's role to admin or user."""
    if payload.role not in ("admin", "user"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'admin' or 'user'",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Protect the primary admin
    if user.email == "saeedmian074@gmail.com" and payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote the primary platform administrator",
        )

    user.role = payload.role
    await db.commit()
    await db.refresh(user)

    return {
        "message": f"User role updated to {payload.role}",
        "user_id": str(user.id),
        "role": user.role,
    }


@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    payload: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Toggle a user's active/deactivated status."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own administrator account",
        )

    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)

    return {
        "message": f"User status updated to {'active' if user.is_active else 'deactivated'}",
        "user_id": str(user.id),
        "is_active": user.is_active,
    }


@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Delete a user account."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.id == admin_user.id or user.email == "saeedmian074@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the primary administrator account",
        )

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully", "user_id": str(user_id)}
