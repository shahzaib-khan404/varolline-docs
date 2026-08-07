"""File upload endpoints."""

from fastapi import APIRouter, File, UploadFile

from app.api.deps import DB, OptionalUser
from app.schemas.file import FileRead
from app.services.file_service import FileService

router = APIRouter()


@router.post("/upload", response_model=FileRead, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    current_user: OptionalUser = None,
    db: DB = None,
):
    service = FileService(db)
    stored_file = await service.upload(
        file, owner_id=current_user.id if current_user else None
    )
    read = FileRead.model_validate(stored_file)
    read.url = await service.get_download_url(stored_file)
    return read
