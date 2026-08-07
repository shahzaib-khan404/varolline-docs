"""User profile endpoints."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DB
from app.schemas.user import UserRead, UserUpdate
from app.services.user import UserService

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(data: UserUpdate, current_user: CurrentUser, db: DB):
    service = UserService(db)
    return await service.update_profile(current_user.id, data)
