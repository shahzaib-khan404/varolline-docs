"""File upload, secure download, and lifecycle endpoints."""

import base64
import mimetypes
from pathlib import Path
import fitz
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, status
from fastapi.responses import FileResponse

import re
import httpx
from pydantic import BaseModel, Field
from app.api.deps import DB, OptionalUser
from app.core.config import settings
from app.core.security import verify_download_token
from app.schemas.file import FileRead
from app.services.file_service import FileService

router = APIRouter()

ALLOWED_STORAGE_FOLDERS = {"originals", "processed", "temp", "ads"}


class UploadFromUrlRequest(BaseModel):
    url: str = Field(..., description="Public or shared URL from Google Drive, Dropbox, or direct web link")
    filename: str | None = Field(None, description="Optional custom filename override")


def resolve_direct_cloud_url(raw_url: str) -> tuple[str, str]:
    """
    Transforms Google Drive or Dropbox sharing links into direct stream download links.
    Returns (download_url, fallback_filename).
    """
    url = raw_url.strip()

    # 1. Google Drive Links
    gdrive_match = re.search(r'(?:drive\.google\.com/file/d/|drive\.google\.com/open\?id=)([a-zA-Z0-9_-]+)', url)
    if gdrive_match:
        file_id = gdrive_match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t", f"gdrive_{file_id[:8]}.pdf"

    # 2. Dropbox Links
    if "dropbox.com" in url:
        if "dl=0" in url:
            direct_url = url.replace("dl=0", "dl=1")
        elif "?" in url:
            direct_url = f"{url}&dl=1"
        else:
            direct_url = f"{url}?dl=1"

        filename_match = re.search(r'/([^/?#]+\.pdf)', url, re.IGNORECASE)
        fallback_name = filename_match.group(1) if filename_match else "dropbox_document.pdf"
        return direct_url, fallback_name

    # 3. Direct URL
    filename_match = re.search(r'/([^/?#]+\.[a-zA-Z0-9]+)(?:[?#]|$)', url)
    fallback_name = filename_match.group(1) if filename_match else "remote_document.pdf"
    return url, fallback_name


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


@router.post("/upload-from-url", response_model=FileRead, status_code=201)
async def upload_from_url(
    body: UploadFromUrlRequest,
    current_user: OptionalUser = None,
    db: DB = None,
):
    """Import and persist a PDF directly from Google Drive, Dropbox, or a web URL."""
    download_url, fallback_name = resolve_direct_cloud_url(body.url)
    target_filename = body.filename.strip() if body.filename else fallback_name

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
            resp = await client.get(download_url, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download file from cloud provider (HTTP {resp.status_code}). Please verify the link is accessible."
                )
            content = resp.content

            # Extract real filename from Content-Disposition if present
            cd = resp.headers.get("content-disposition", "")
            if "filename=" in cd:
                fname_match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', cd)
                if fname_match and not body.filename:
                    target_filename = fname_match.group(1).strip()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not connect to URL: {str(exc)}"
        )

    service = FileService(db)
    stored_file = await service.upload_bytes(
        content,
        filename=target_filename,
        owner_id=current_user.id if current_user else None,
    )
    read = FileRead.model_validate(stored_file)
    read.url = await service.get_download_url(stored_file)
    return read


@router.get("/download/{folder}/{filename}")
async def secure_download_file(
    folder: str,
    filename: str,
    token: str | None = Query(None, description="HMAC-SHA256 authorization token"),
    expires: int | None = Query(None, description="UNIX timestamp expiration"),
    download: bool = Query(False, description="Whether to trigger file attachment download"),
):
    """
    Cryptographically verified download endpoint with expiring HMAC token.
    Prevents unauthorized access, IDOR file enumeration, and path traversal.
    """
    # 1. Path traversal defense
    if folder not in ALLOWED_STORAGE_FOLDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid storage folder.")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename format.")

    storage_key = f"{folder}/{filename}"

    # 2. Cryptographic token & expiration verification (Ads are public marketing assets and do not expire)
    if folder != "ads":
        if not token or not expires or not verify_download_token(storage_key, token, expires):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Download link is invalid, expired, or has been tampered with.",
            )

    # 3. Locate physical file on storage
    file_path = settings.LOCAL_UPLOAD_DIR / folder / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File has expired or is no longer available on server.",
        )

    # 4. MIME type resolution
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        ext = file_path.suffix.lower()
        if ext == ".pdf":
            mime_type = "application/pdf"
        elif ext in (".jpg", ".jpeg"):
            mime_type = "image/jpeg"
        elif ext == ".png":
            mime_type = "image/png"
        elif ext == ".docx":
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif ext == ".zip":
            mime_type = "application/zip"
        else:
            mime_type = "application/octet-stream"

    # Friendly download name (strip any 32-hex prefix if present)
    download_filename = filename
    if "_" in filename and len(filename.split("_", 1)[0]) == 32:
        download_filename = filename.split("_", 1)[1]

    # Guarantee correct file extension is preserved
    ext = file_path.suffix or (".pdf" if mime_type == "application/pdf" else "")
    if ext and not download_filename.lower().endswith(ext.lower()):
        download_filename = f"{download_filename}{ext}"

    from urllib.parse import quote
    import re
    safe_ascii_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', download_filename)
    if ext and not safe_ascii_name.lower().endswith(ext.lower()):
        safe_ascii_name = f"{safe_ascii_name}{ext}"
    encoded_name = quote(download_filename)

    disposition_type = "attachment" if download else "inline"
    content_disposition = f'{disposition_type}; filename="{safe_ascii_name}"; filename*=UTF-8\'\'{encoded_name}'

    # 5. Serve with security headers
    allowed_origins = " ".join(settings.ALLOWED_ORIGINS)
    headers = {
        "content-disposition": content_disposition,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Content-Security-Policy": f"frame-ancestors 'self' {allowed_origins}",
    }

    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        headers=headers,
    )


@router.post("/purge/{folder}/{filename}")
async def purge_file_now(
    folder: str,
    filename: str,
    token: str = Query(..., description="HMAC-SHA256 authorization token"),
    expires: int = Query(..., description="UNIX timestamp expiration"),
):
    """
    Immediate Zero-Retention Purge: Securely shred a processed file right after user download.
    """
    if folder not in ALLOWED_STORAGE_FOLDERS or ".." in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request.")

    storage_key = f"{folder}/{filename}"
    if not verify_download_token(storage_key, token, expires):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized purge request.")

    file_path = settings.LOCAL_UPLOAD_DIR / folder / filename
    if file_path.exists() and file_path.is_file():
        file_path.unlink(missing_ok=True)
        return {"status": "purged", "message": "File securely destroyed from server."}

    return {"status": "not_found", "message": "File already removed."}


@router.post("/preview-pages")
async def preview_pages(
    file: UploadFile = File(...),
    max_pages: int = 10,
):
    """
    Render PDF pages to high-resolution PNG data URLs for real-time document studio previews.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded.")

    try:
        doc = fitz.open(stream=bytes(content), filetype="pdf")
        if doc.is_encrypted:
            # Many PDFs with printing or permission locks open with empty string password
            doc.authenticate("")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse PDF file: {exc}",
        )

    # Check if document remains locked
    if doc.is_encrypted:
        try:
            _ = doc[0]
        except Exception:
            doc.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This PDF is password-protected. Please unlock it using the Unlock PDF tool first.",
            )

    total_pages = len(doc)
    pages_to_render = min(total_pages, max_pages)
    previews = []

    for i in range(pages_to_render):
        try:
            page = doc[i]
            pix = page.get_pixmap(dpi=110)
            img_bytes = pix.tobytes("png")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
        except Exception as render_err:
            log.warning("page_render_failed", page=i, error=str(render_err))
            continue

        # Auto-detect existing text blocks and graphics for interactive outline boxes
        detected_blocks = []
        try:
            raw_blocks = page.get_text("blocks")
            for b_idx, b in enumerate(raw_blocks):
                x0, y0, x1, y1, text, block_no, block_type = b
                clean_text = text.strip()
                if not clean_text:
                    continue
                line_count = max(1, clean_text.count("\n") + 1)
                est_font_size = round(max(9.0, min(36.0, (y1 - y0) / line_count * 0.8)), 1)
                detected_blocks.append({
                    "id": f"blk-{i+1}-{b_idx}",
                    "type": "text",
                    "x": round(x0, 1),
                    "y": round(y0, 1),
                    "width": round(x1 - x0, 1),
                    "height": round(y1 - y0, 1),
                    "text": clean_text,
                    "fontSize": est_font_size,
                })
        except Exception:
            pass

        try:
            for img_idx, img_info in enumerate(page.get_image_info()):
                bbox = img_info.get("bbox")
                if bbox:
                    x0, y0, x1, y1 = bbox
                    if x1 > x0 + 10 and y1 > y0 + 10:
                        detected_blocks.append({
                            "id": f"img-{i+1}-{img_idx}",
                            "type": "image",
                            "x": round(x0, 1),
                            "y": round(y0, 1),
                            "width": round(x1 - x0, 1),
                            "height": round(y1 - y0, 1),
                            "text": "",
                        })
        except Exception:
            pass

        previews.append({
            "page_num": i + 1,
            "data_url": f"data:image/png;base64,{b64}",
            "width": page.rect.width,
            "height": page.rect.height,
            "blocks": detected_blocks,
        })

    # Check for fillable AcroForm widgets or run auto-detection
    native_fields = []
    has_native = False
    try:
        from app.services.pdf.pdf_forms import get_form_fields
        form_info = get_form_fields(content)
        native_fields = form_info.get("fields", [])
        has_native = len(native_fields) > 0
    except Exception as exc:
        log.warning("get_form_fields_failed", error=str(exc))

    detected_fields = []
    if not has_native:
        try:
            from app.services.pdf.pdf_forms import detect_form_fields
            detected_fields = detect_form_fields(content)
        except Exception as exc:
            log.warning("detect_form_fields_failed", error=str(exc))
            detected_fields = []

    has_any_fields = has_native or (len(detected_fields) > 0)
    all_fields = native_fields if has_native else detected_fields

    doc.close()
    return {
        "total_pages": total_pages,
        "previews": previews,
        "has_fillable_fields": has_any_fields,
        "native_fields": all_fields,
        "is_auto_detected": not has_native and len(detected_fields) > 0,
        "detected_count": len(detected_fields),
    }


@router.post("/detect-form-fields")
async def detect_forms_api(
    file: UploadFile = File(...),
):
    """
    Optimized heuristic & layout detection technique to identify fillable form fields
    (text inputs, checkboxes, dates, signatures) on flattened or scanned PDFs.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded.")
    try:
        from app.services.pdf.pdf_forms import detect_form_fields
        fields = detect_form_fields(content)
        return {
            "status": "success",
            "fields_count": len(fields),
            "fields": fields,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Form detection error: {exc}",
        )

