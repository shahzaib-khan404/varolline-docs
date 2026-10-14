"""Celery task definitions — each processing tool has its own task."""

import asyncio
import uuid
from uuid import UUID

import structlog
from celery import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.workers.celery_app import celery_app

log = structlog.get_logger(__name__)

# Synchronous engine for Celery (Celery workers are not async)
from sqlalchemy import event

sync_db_url = settings.DATABASE_URL.replace("+asyncpg", "").replace("+aiosqlite", "")
sync_engine = create_engine(
    sync_db_url,
    pool_pre_ping=True,
)

if "sqlite" in sync_db_url:
    @event.listens_for(sync_engine, "connect")
    def set_sqlite_sync_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

import threading

SyncSession = sessionmaker(bind=sync_engine, expire_on_commit=False)

# Concurrency semaphore to throttle simultaneous heavy PDF processing and protect server from crashes
HEAVY_TASK_SEMAPHORE = threading.Semaphore(settings.MAX_CONCURRENT_PDF_JOBS)


def get_sync_db():
    """Synchronous DB session for Celery tasks."""
    session = SyncSession()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@celery_app.task(bind=True, name="app.workers.tasks.dispatch_job", max_retries=3)
def dispatch_job(self: Task, job_id: str):
    """
    Entry point for all processing jobs.
    Reads job.tool and routes to the appropriate task.
    """
    from app.models.job import Job
    from sqlalchemy import select

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("dispatch_job_not_found", job_id=job_id)
            return

        # Update status to processing
        job.status = "processing"
        job.celery_task_id = self.request.id
        session.commit()

        tool_map = {
            "merge_pdf": process_merge_pdf,
            "split_pdf": process_split_pdf,
            "compress_pdf": process_compress_pdf,
            "pdf_to_image": process_pdf_to_image,
            "image_to_pdf": process_image_to_pdf,
            "pdf_to_word": process_pdf_to_word,
            "word_to_pdf": process_word_to_pdf,
            "rotate_pdf": process_rotate_pdf,
            "delete_pages": process_delete_pages,
            "watermark_pdf": process_watermark_pdf,
            "password_protect": process_password_protect,
            "ocr_extraction": process_ocr_extraction,
            "organize_pdf": process_organize_pdf,
            "page_numbers": process_page_numbers,
            "unlock_pdf": process_unlock_pdf,
            "crop_pdf": process_crop_pdf,
            "repair_pdf": process_repair_pdf,
            "powerpoint_to_pdf": process_powerpoint_to_pdf,
            "excel_to_pdf": process_excel_to_pdf,
            "pdf_to_excel": process_pdf_to_excel,
            "html_to_pdf": process_html_to_pdf,
            "pdf_to_pdfa": process_pdf_to_pdfa,
            "edit_pdf": process_edit_pdf,
            "sign_pdf": process_sign_pdf,
            "redact_pdf": process_redact_pdf,
            "pdf_forms": process_pdf_forms,
            "ocr_pdf": process_ocr_pdf,
            "compare_pdf": process_compare_pdf,
        }

        task_fn = tool_map.get(job.tool)
        if not task_fn:
            job.status = "failed"
            job.error_message = f"Unknown tool: {job.tool}"
            session.commit()
            return

    # Execute tool task under semaphore control to prevent CPU/RAM saturation
    try:
        acquired = HEAVY_TASK_SEMAPHORE.acquire(timeout=180)  # Wait up to 3 minutes for an available worker slot
        if not acquired:
            with SyncSession() as session:
                _update_job(session, job_id, status="failed", error_message="Server is busy processing high traffic. Please retry in a few moments.")
            return
        try:
            task_fn.delay(job_id)
        finally:
            HEAVY_TASK_SEMAPHORE.release()
    except Exception as exc:
        log.error("task_dispatch_failed", job_id=job_id, error=str(exc))
        with SyncSession() as session:
            _update_job(session, job_id, status="failed", error_message=str(exc))


def _update_job(session, job_id: str, **kwargs):
    from app.models.job import Job
    job = session.get(Job, UUID(job_id))
    if job:
        for k, v in kwargs.items():
            setattr(job, k, v)
        session.commit()
    return job


@celery_app.task(bind=True, name="app.workers.tasks.process_merge_pdf", queue="pdf")
def process_merge_pdf(self: Task, job_id: str):
    """Merge multiple PDFs into a single file using PyMuPDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.merger import merge_pdfs
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_merge_pdf_job_not_found", job_id=job_id)
            return

        try:
            # ── 1. Resolve file records ───────────────────────────────────────
            primary_file = session.get(File, job.input_file_id)
            if not primary_file:
                raise ValueError("Primary input file not found in database.")

            additional_ids: list[str] = (job.options or {}).get(
                "additional_file_ids", []
            )
            file_records = [primary_file]
            for raw_id in additional_ids:
                f = session.get(File, uuid.UUID(str(raw_id)))
                if not f:
                    raise ValueError(f"Additional file {raw_id} not found.")
                file_records.append(f)

            n = len(file_records)
            log.info("process_merge_pdf_start", job_id=job_id, file_count=n)

            # ── 2. Load PDFs from storage ─────────────────────────────────────
            pdf_bytes_list: list[bytes] = []
            for i, fr in enumerate(file_records):
                job.progress = int(5 + 60 * (i / n))
                session.commit()

                raw = task_storage.load(fr.storage_key)
                pdf_bytes_list.append(raw)

            # ── 3. Merge ──────────────────────────────────────────────────────
            job.progress = 70
            session.commit()

            merged_bytes = merge_pdfs(pdf_bytes_list)

            # ── 4. Build output filename ──────────────────────────────────────
            base = primary_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_merged.pdf"

            # ── 5. Persist to storage ─────────────────────────────────────────
            job.progress = 90
            session.commit()

            output_key = task_storage.save(merged_bytes, output_filename)

            # ── 6. Finalise ───────────────────────────────────────────────────
            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(merged_bytes)
            session.commit()

            log.info(
                "process_merge_pdf_completed",
                job_id=job_id,
                output_size=len(merged_bytes),
                pages=n,
            )

        except Exception as exc:
            log.error(
                "process_merge_pdf_failed",
                job_id=job_id,
                error=str(exc),
                exc_info=True,
            )
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_split_pdf", queue="pdf")
def process_split_pdf(self: Task, job_id: str):
    """Split a PDF into multiple files using PyMuPDF, returned as a ZIP."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.splitter import split_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_split_pdf_job_not_found", job_id=job_id)
            return

        try:
            opts = job.options or {}
            mode = str(opts.get("mode", "all"))
            ranges: str | None = opts.get("ranges")
            n: int | None = opts.get("n")

            # ── Load input file ───────────────────────────────────────────────
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_split_pdf_start", job_id=job_id, mode=mode)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            # ── Split ─────────────────────────────────────────────────────────
            job.progress = 40
            session.commit()

            zip_bytes = split_pdf(
                pdf_bytes,
                base_name=input_file.original_filename.rsplit(".", 1)[0],
                mode=mode,
                ranges=ranges,
                n=int(n) if n is not None else None,
            )

            # ── Save ZIP to storage ───────────────────────────────────────────
            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_split.zip"
            output_key = task_storage.save(zip_bytes, output_filename)

            # ── Finalise ──────────────────────────────────────────────────────
            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(zip_bytes)
            session.commit()

            log.info(
                "process_split_pdf_completed",
                job_id=job_id,
                zip_size=len(zip_bytes),
            )

        except Exception as exc:
            log.error("process_split_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_compress_pdf", queue="pdf")
def process_compress_pdf(self: Task, job_id: str):
    """Compress a PDF using Ghostscript (PyMuPDF fallback)."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.compressor import compress_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_compress_pdf_job_not_found", job_id=job_id)
            return

        try:
            quality = str((job.options or {}).get("quality", "ebook"))

            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_compress_pdf_start", job_id=job_id, quality=quality)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            compressed = compress_pdf(pdf_bytes, quality=quality)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_compressed.pdf"
            output_key = task_storage.save(compressed, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(compressed)
            session.commit()

            log.info(
                "process_compress_pdf_completed",
                job_id=job_id,
                original=len(pdf_bytes),
                compressed=len(compressed),
            )

        except Exception as exc:
            log.error("process_compress_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_pdf_to_image", queue="images")
def process_pdf_to_image(self: Task, job_id: str):
    """Render each PDF page to PNG/JPG and return a ZIP archive."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.pdf_to_image import pdf_to_images
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_pdf_to_image_job_not_found", job_id=job_id)
            return

        try:
            opts = job.options or {}
            fmt = str(opts.get("format", "png"))
            dpi = int(opts.get("dpi", 150))

            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_pdf_to_image_start", job_id=job_id, fmt=fmt, dpi=dpi)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 20
            session.commit()

            zip_bytes = pdf_to_images(pdf_bytes, fmt=fmt, dpi=dpi)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_images.zip"
            output_key = task_storage.save(zip_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(zip_bytes)
            session.commit()

            log.info(
                "process_pdf_to_image_completed",
                job_id=job_id,
                zip_size=len(zip_bytes),
            )

        except Exception as exc:
            log.error("process_pdf_to_image_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_image_to_pdf", queue="images")
def process_image_to_pdf(self: Task, job_id: str):
    """Convert one or more images into a single PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.image_to_pdf import images_to_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_image_to_pdf_job_not_found", job_id=job_id)
            return

        try:
            # ── 1. Resolve file records (primary + additional) ────────────────
            primary_file = session.get(File, job.input_file_id)
            if not primary_file:
                raise ValueError("Primary input file not found.")

            additional_ids: list[str] = (job.options or {}).get("additional_file_ids", [])
            file_records = [primary_file]
            for raw_id in additional_ids:
                f = session.get(File, uuid.UUID(str(raw_id)))
                if not f:
                    raise ValueError(f"Additional file {raw_id} not found.")
                file_records.append(f)

            n = len(file_records)
            log.info("process_image_to_pdf_start", job_id=job_id, file_count=n)

            # ── 2. Load image bytes ───────────────────────────────────────────
            image_bytes_list: list[bytes] = []
            for i, fr in enumerate(file_records):
                job.progress = int(5 + 60 * (i / n))
                session.commit()
                image_bytes_list.append(task_storage.load(fr.storage_key))

            # ── 3. Convert ────────────────────────────────────────────────────
            job.progress = 70
            session.commit()

            pdf_bytes = images_to_pdf(image_bytes_list)

            # ── 4. Persist ────────────────────────────────────────────────────
            job.progress = 85
            session.commit()

            base = primary_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_converted.pdf"
            output_key = task_storage.save(pdf_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(pdf_bytes)
            session.commit()

            log.info(
                "process_image_to_pdf_completed",
                job_id=job_id,
                output_size=len(pdf_bytes),
            )

        except Exception as exc:
            log.error("process_image_to_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_pdf_to_word", queue="documents")
def process_pdf_to_word(self: Task, job_id: str):
    """Extract text and images from a PDF and produce a .docx file."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.pdf_to_word import pdf_to_word
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_pdf_to_word_job_not_found", job_id=job_id)
            return

        try:
            # ── 1. Load PDF ───────────────────────────────────────────────────
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_pdf_to_word_start", job_id=job_id,
                     filename=input_file.original_filename)

            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            # ── 2. Convert ────────────────────────────────────────────────────
            job.progress = 30
            session.commit()

            docx_bytes = pdf_to_word(pdf_bytes)

            # ── 3. Persist ────────────────────────────────────────────────────
            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}.docx"
            output_key = task_storage.save(docx_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(docx_bytes)
            session.commit()

            log.info("process_pdf_to_word_completed", job_id=job_id,
                     output_size=len(docx_bytes))

        except Exception as exc:
            log.error("process_pdf_to_word_failed", job_id=job_id,
                      error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_word_to_pdf", queue="documents")
def process_word_to_pdf(self: Task, job_id: str):
    """Convert a .docx file to PDF (LibreOffice if available, else ReportLab)."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.word_to_pdf import word_to_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_word_to_pdf_job_not_found", job_id=job_id)
            return

        try:
            # ── 1. Load DOCX ──────────────────────────────────────────────────
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_word_to_pdf_start", job_id=job_id,
                     filename=input_file.original_filename)

            job.progress = 10
            session.commit()

            docx_bytes = task_storage.load(input_file.storage_key)

            # ── 2. Convert ────────────────────────────────────────────────────
            job.progress = 30
            session.commit()

            pdf_bytes = word_to_pdf(docx_bytes)

            # ── 3. Persist ────────────────────────────────────────────────────
            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}.pdf"
            output_key = task_storage.save(pdf_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(pdf_bytes)
            session.commit()

            log.info("process_word_to_pdf_completed", job_id=job_id,
                     output_size=len(pdf_bytes))

        except Exception as exc:
            log.error("process_word_to_pdf_failed", job_id=job_id,
                      error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_rotate_pdf", queue="pdf")
def process_rotate_pdf(self: Task, job_id: str):
    """Rotate selected PDF pages by the requested angle."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.rotate_pdf import rotate_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_rotate_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            angle = int(opts.get("angle", 90))
            pages = str(opts.get("pages", "all"))

            log.info("process_rotate_pdf_start", job_id=job_id, angle=angle, pages=pages)

            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 40
            session.commit()

            out_bytes = rotate_pdf(pdf_bytes, angle=angle, pages=pages)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_rotated.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_rotate_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_rotate_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_delete_pages", queue="pdf")
def process_delete_pages(self: Task, job_id: str):
    """Remove specified pages from a PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.delete_pages import delete_pages
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_delete_pages_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            pages = str(opts.get("pages", ""))
            if not pages:
                raise ValueError("No pages specified for deletion.")

            log.info("process_delete_pages_start", job_id=job_id, pages=pages)

            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 40
            session.commit()

            out_bytes = delete_pages(pdf_bytes, pages=pages)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_edited.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_delete_pages_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()
            try:
                log.error("process_delete_pages_failed", job_id=job_id, error=str(exc), exc_info=True)
            except Exception:
                pass


@celery_app.task(bind=True, name="app.workers.tasks.process_watermark_pdf", queue="pdf")
def process_watermark_pdf(self: Task, job_id: str):
    """Add a text watermark to selected PDF pages."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.watermark_pdf import watermark_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_watermark_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            text = str(opts.get("text", "WATERMARK")).strip()
            angle = float(opts.get("angle", 45))
            color = str(opts.get("color", "#808080"))
            opacity = float(opts.get("opacity", 0.3))
            pages = str(opts.get("pages", "all"))
            font_size_raw = opts.get("font_size")
            font_size = float(font_size_raw) if font_size_raw else None

            log.info("process_watermark_pdf_start", job_id=job_id, text=text, pages=pages)

            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 40
            session.commit()

            out_bytes = watermark_pdf(
                pdf_bytes,
                text=text,
                angle=angle,
                color=color,
                opacity=opacity,
                font_size=font_size,
                pages=pages,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_watermarked.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_watermark_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_watermark_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_password_protect", queue="pdf")
def process_password_protect(self: Task, job_id: str):
    """Encrypt a PDF with AES-256 and user-supplied permissions."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.password_protect import password_protect
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_password_protect_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            user_password = str(opts.get("user_password", "")).strip()
            owner_password = opts.get("owner_password")
            if owner_password:
                owner_password = str(owner_password).strip() or None
            allow_printing = bool(opts.get("allow_printing", True))
            allow_copying = bool(opts.get("allow_copying", True))

            if not user_password:
                raise ValueError("User password is required.")

            log.info("process_password_protect_start", job_id=job_id)

            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 40
            session.commit()

            out_bytes = password_protect(
                pdf_bytes,
                user_password=user_password,
                owner_password=owner_password,
                allow_printing=allow_printing,
                allow_copying=allow_copying,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_protected.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_password_protect_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_password_protect_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_ocr_extraction", queue="documents")
def process_ocr_extraction(self: Task, job_id: str):
    """Extract text from a PDF using Tesseract OCR where needed."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.ocr_pdf import ocr_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_ocr_extraction_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            output_format = str(opts.get("output_format", "txt"))
            language = str(opts.get("language", "eng"))
            pages = str(opts.get("pages", "all"))
            dpi = int(opts.get("dpi", 200))

            log.info("process_ocr_extraction_start", job_id=job_id,
                     output_format=output_format, language=language)

            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 20
            session.commit()

            out_bytes = ocr_pdf(
                pdf_bytes,
                output_format=output_format,
                language=language,
                pages=pages,
                dpi=dpi,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            ext = "pdf" if output_format == "pdf" else "txt"
            output_filename = f"{base}_ocr.{ext}"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_ocr_extraction_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_ocr_extraction_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()

@celery_app.task(bind=True, name="app.workers.tasks.process_organize_pdf", queue="pdf")
def process_organize_pdf(self: Task, job_id: str):
    """Reorder, rotate, delete, or append pages in a PDF document."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.organize_pdf import organize_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_organize_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Primary input file not found.")

            opts = job.options or {}
            pages = opts.get("pages")
            page_order = opts.get("page_order")
            delete_pages = opts.get("delete_pages")
            rotations = opts.get("rotations")
            extra_ids = opts.get("additional_file_ids", [])

            log.info("process_organize_pdf_start", job_id=job_id)
            job.progress = 15
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            insert_bytes_list = []
            for raw_id in extra_ids:
                extra_f = session.get(File, uuid.UUID(str(raw_id)))
                if extra_f:
                    insert_bytes_list.append(task_storage.load(extra_f.storage_key))

            job.progress = 40
            session.commit()

            out_bytes = organize_pdf(
                pdf_bytes,
                pages=pages,
                page_order=page_order,
                delete_pages=delete_pages,
                rotations=rotations,
                insert_pdf_bytes_list=insert_bytes_list if insert_bytes_list else None,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_organized.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_organize_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_organize_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_page_numbers", queue="pdf")
def process_page_numbers(self: Task, job_id: str):
    """Add dynamic page numbers onto PDF pages."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.page_numbers import add_page_numbers
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_page_numbers_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            position = str(opts.get("position", "bottom-center"))
            page_mode = str(opts.get("page_mode", "single"))
            format_tpl = str(opts.get("format", "{n}"))
            start_page = int(opts.get("start_page", 1))
            end_page = int(opts.get("end_page")) if opts.get("end_page") is not None else None
            first_num = int(opts.get("first_number", 1))
            margin = opts.get("margin", "recommended")
            font_size = float(opts.get("font_size", 10.0))
            font_name = str(opts.get("font_name", "helv"))
            bold = bool(opts.get("bold", False))
            italic = bool(opts.get("italic", False))
            raw_color = opts.get("color")
            color = tuple(float(c) for c in raw_color[:3]) if isinstance(raw_color, (list, tuple)) else (0.2, 0.2, 0.2)

            log.info("process_page_numbers_start", job_id=job_id, position=position, page_mode=page_mode)
            job.progress = 20
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            out_bytes = add_page_numbers(
                pdf_bytes,
                position=position,
                page_mode=page_mode,
                format_template=format_tpl,
                start_page=start_page,
                end_page=end_page,
                first_number=first_num,
                margin=margin,
                font_size=font_size,
                font_name=font_name,
                bold=bold,
                italic=italic,
                color=color,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_numbered.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_page_numbers_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_page_numbers_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_unlock_pdf", queue="pdf")
def process_unlock_pdf(self: Task, job_id: str):
    """Decrypt or remove restrictions from a password-protected PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.unlock_pdf import unlock_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_unlock_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            password = str(opts.get("password", ""))

            log.info("process_unlock_pdf_start", job_id=job_id)
            job.progress = 20
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            out_bytes = unlock_pdf(pdf_bytes, password=password)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_unlocked.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_unlock_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_unlock_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_crop_pdf", queue="pdf")
def process_crop_pdf(self: Task, job_id: str):
    """Crop margins or boundaries of PDF pages."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.crop_pdf import crop_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_crop_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            margin_top = float(opts.get("margin_top", 0.0))
            margin_bottom = float(opts.get("margin_bottom", 0.0))
            margin_left = float(opts.get("margin_left", 0.0))
            margin_right = float(opts.get("margin_right", 0.0))
            pages = str(opts.get("pages", "all"))

            log.info("process_crop_pdf_start", job_id=job_id)
            job.progress = 20
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            out_bytes = crop_pdf(
                pdf_bytes,
                margin_top=margin_top,
                margin_bottom=margin_bottom,
                margin_left=margin_left,
                margin_right=margin_right,
                pages=pages,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_cropped.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_crop_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_crop_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_repair_pdf", queue="pdf")
def process_repair_pdf(self: Task, job_id: str):
    """Repair damaged or corrupted PDF structure."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.repair_pdf import repair_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_repair_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_repair_pdf_start", job_id=job_id)
            job.progress = 25
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            out_bytes = repair_pdf(pdf_bytes)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_repaired.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_repair_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_repair_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()



@celery_app.task(bind=True, name="app.workers.tasks.process_powerpoint_to_pdf", queue="documents")
def process_powerpoint_to_pdf(self: Task, job_id: str):
    """Convert PowerPoint presentation (.pptx, .ppt) to PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.powerpoint_to_pdf import powerpoint_to_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_powerpoint_to_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_powerpoint_to_pdf_start", job_id=job_id, filename=input_file.original_filename)
            job.progress = 10
            session.commit()

            pptx_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            ext = input_file.original_filename.rsplit(".", 1)[-1].lower() if "." in input_file.original_filename else "pptx"
            pdf_bytes = powerpoint_to_pdf(pptx_bytes, ext=ext)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}.pdf"
            output_key = task_storage.save(pdf_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(pdf_bytes)
            session.commit()

            log.info("process_powerpoint_to_pdf_completed", job_id=job_id, output_size=len(pdf_bytes))

        except Exception as exc:
            log.error("process_powerpoint_to_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_excel_to_pdf", queue="documents")
def process_excel_to_pdf(self: Task, job_id: str):
    """Convert Excel spreadsheet (.xlsx, .xls, .csv) to PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.excel_to_pdf import excel_to_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_excel_to_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_excel_to_pdf_start", job_id=job_id, filename=input_file.original_filename)
            job.progress = 10
            session.commit()

            excel_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            ext = input_file.original_filename.rsplit(".", 1)[-1].lower() if "." in input_file.original_filename else "xlsx"
            pdf_bytes = excel_to_pdf(excel_bytes, ext=ext)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}.pdf"
            output_key = task_storage.save(pdf_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(pdf_bytes)
            session.commit()

            log.info("process_excel_to_pdf_completed", job_id=job_id, output_size=len(pdf_bytes))

        except Exception as exc:
            log.error("process_excel_to_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_pdf_to_excel", queue="documents")
def process_pdf_to_excel(self: Task, job_id: str):
    """Extract tables from PDF into an Excel spreadsheet (.xlsx)."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.pdf_to_excel import pdf_to_excel
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_pdf_to_excel_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            log.info("process_pdf_to_excel_start", job_id=job_id, filename=input_file.original_filename)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            xlsx_bytes = pdf_to_excel(pdf_bytes)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}.xlsx"
            output_key = task_storage.save(xlsx_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(xlsx_bytes)
            session.commit()

            log.info("process_pdf_to_excel_completed", job_id=job_id, output_size=len(xlsx_bytes))

        except Exception as exc:
            log.error("process_pdf_to_excel_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_html_to_pdf", queue="documents")
def process_html_to_pdf(self: Task, job_id: str):
    """Convert HTML document (.html, .htm) to PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.html_to_pdf import html_to_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_html_to_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            page_size = opts.get("page_size", "A4")
            margin = float(opts.get("margin", 36.0))

            log.info("process_html_to_pdf_start", job_id=job_id, filename=input_file.original_filename)
            job.progress = 10
            session.commit()

            html_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            pdf_bytes = html_to_pdf(html_bytes, page_size=page_size, margin=margin)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}.pdf"
            output_key = task_storage.save(pdf_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(pdf_bytes)
            session.commit()

            log.info("process_html_to_pdf_completed", job_id=job_id, output_size=len(pdf_bytes))

        except Exception as exc:
            log.error("process_html_to_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_pdf_to_pdfa", queue="pdf")
def process_pdf_to_pdfa(self: Task, job_id: str):
    """Convert standard PDF to archival PDF/A compliant document."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.pdf_to_pdfa import pdf_to_pdfa
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_pdf_to_pdfa_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            conformance = opts.get("conformance", "2b")
            password = opts.get("password")
            allow_downgrade = opts.get("allow_downgrade", True)

            log.info("process_pdf_to_pdfa_start", job_id=job_id, conformance=conformance)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            out_bytes = pdf_to_pdfa(
                pdf_bytes,
                conformance=conformance,
                password=password,
                allow_downgrade=allow_downgrade,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_pdfa.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_pdf_to_pdfa_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_pdf_to_pdfa_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()



@celery_app.task(bind=True, name="app.workers.tasks.process_edit_pdf", queue="pdf")
def process_edit_pdf(self: Task, job_id: str):
    """Overlay text, shapes, and images onto PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.edit_pdf import edit_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_edit_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            elements = opts.get("elements", [])

            log.info("process_edit_pdf_start", job_id=job_id, element_count=len(elements))
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            out_bytes = edit_pdf(pdf_bytes, elements=elements)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_edited.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_edit_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_edit_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_sign_pdf", queue="pdf")
def process_sign_pdf(self: Task, job_id: str):
    """Place signature stamp and audit metadata onto PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.sign_pdf import sign_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_sign_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            fields = opts.get("fields")
            signature_type = opts.get("signature_type", "simple")
            page_number = int(opts.get("page", 1))
            signature_image = opts.get("signature_image")
            signer_name = opts.get("signer_name")
            signer_email = opts.get("signer_email")
            organization = opts.get("organization")
            signing_reason = opts.get("signing_reason")
            signing_location = opts.get("signing_location")
            compliance_level = opts.get("compliance_level", "qes")
            lock_document = bool(opts.get("lock_document", False))
            attach_audit_page = bool(opts.get("attach_audit_page", True))
            x = float(opts.get("x", 100.0))
            y = float(opts.get("y", 650.0))
            width = float(opts.get("width", 160.0))
            height = float(opts.get("height", 60.0))
            add_audit_trail = bool(opts.get("add_audit_trail", True))

            log.info(
                "process_sign_pdf_start",
                job_id=job_id,
                signer=signer_name,
                signer_email=signer_email,
                sig_type=signature_type,
            )
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            out_bytes = sign_pdf(
                pdf_bytes,
                fields=fields,
                signature_type=signature_type,
                page_number=page_number,
                signature_image=signature_image,
                signer_name=signer_name,
                signer_email=signer_email,
                organization=organization,
                signing_reason=signing_reason,
                signing_location=signing_location,
                compliance_level=compliance_level,
                lock_document=lock_document,
                attach_audit_page=attach_audit_page,
                x=x,
                y=y,
                width=width,
                height=height,
                add_audit_trail=add_audit_trail,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_signed.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_sign_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_sign_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_redact_pdf", queue="pdf")
def process_redact_pdf(self: Task, job_id: str):
    """Permanently scrub text and rectangular areas from PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.redact_pdf import redact_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_redact_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            search_terms = opts.get("search_terms")
            rectangles = opts.get("rectangles")
            patterns = opts.get("patterns")
            full_pages = opts.get("full_pages")
            fill_color = opts.get("fill_color", "#000000")
            overlay_text = opts.get("overlay_text")
            text_color = opts.get("text_color", "#ffffff")
            scrub_metadata = bool(opts.get("scrub_metadata", True))
            password = opts.get("password")
            smart_prompt = opts.get("smart_prompt")

            log.info("process_redact_pdf_start", job_id=job_id)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            out_bytes = redact_pdf(
                pdf_bytes,
                search_terms=search_terms,
                rectangles=rectangles,
                patterns=patterns,
                full_pages=full_pages,
                fill_color=fill_color,
                overlay_text=overlay_text,
                text_color=text_color,
                scrub_metadata=scrub_metadata,
                password=password,
                smart_prompt=smart_prompt,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_redacted.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_redact_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_redact_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_pdf_forms", queue="pdf")
def process_pdf_forms(self: Task, job_id: str):
    """Fill interactive AcroForm fields and optionally flatten PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.pdf_forms import fill_pdf_forms
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_pdf_forms_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            field_values = opts.get("fields", {})
            custom_fields = opts.get("custom_fields", [])
            flatten = bool(opts.get("flatten", True))

            log.info("process_pdf_forms_start", job_id=job_id, field_count=len(field_values), custom_count=len(custom_fields))
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            out_bytes = fill_pdf_forms(pdf_bytes, field_values=field_values, custom_fields=custom_fields, flatten=flatten)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_filled.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_pdf_forms_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_pdf_forms_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()



@celery_app.task(bind=True, name="app.workers.tasks.process_ocr_pdf", queue="pdf")
def process_ocr_pdf(self: Task, job_id: str):
    """Convert scanned PDF into searchable PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.ocr_pdf import ocr_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_ocr_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            output_format = str(opts.get("output_format", "pdf"))
            language = str(opts.get("language", "eng"))

            log.info("process_ocr_pdf_start", job_id=job_id, lang=language, format=output_format)
            job.progress = 10
            session.commit()

            pdf_bytes = task_storage.load(input_file.storage_key)

            job.progress = 30
            session.commit()

            out_bytes = ocr_pdf(
                pdf_bytes,
                output_format=output_format,
                language=language,
            )

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            ext = "txt" if output_format == "txt" else "pdf"
            output_filename = f"{base}_searchable.{ext}"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_ocr_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_ocr_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


@celery_app.task(bind=True, name="app.workers.tasks.process_compare_pdf", queue="pdf")
def process_compare_pdf(self: Task, job_id: str):
    """Compare two PDF documents and produce an annotated diff report PDF."""
    from app.models.file import File
    from app.models.job import Job
    from app.services.pdf.compare_pdf import compare_pdf
    from app.workers.task_helpers import task_storage

    with SyncSession() as session:
        job = session.get(Job, UUID(job_id))
        if not job:
            log.error("process_compare_pdf_job_not_found", job_id=job_id)
            return

        try:
            input_file = session.get(File, job.input_file_id)
            if not input_file:
                raise ValueError("Input file not found.")

            opts = job.options or {}
            secondary_file_id = opts.get("secondary_file_id")

            pdf_bytes_1 = task_storage.load(input_file.storage_key)

            if secondary_file_id:
                secondary_file = session.get(File, UUID(str(secondary_file_id)))
                if secondary_file:
                    pdf_bytes_2 = task_storage.load(secondary_file.storage_key)
                else:
                    pdf_bytes_2 = pdf_bytes_1
            else:
                pdf_bytes_2 = pdf_bytes_1

            log.info("process_compare_pdf_start", job_id=job_id)
            job.progress = 10
            session.commit()

            job.progress = 35
            session.commit()

            out_bytes = compare_pdf(pdf_bytes_1, pdf_bytes_2)

            job.progress = 85
            session.commit()

            base = input_file.original_filename.rsplit(".", 1)[0]
            output_filename = f"{base}_comparison.pdf"
            output_key = task_storage.save(out_bytes, output_filename)

            job.status = "completed"
            job.progress = 100
            job.output_storage_key = output_key
            job.output_filename = output_filename
            job.output_size_bytes = len(out_bytes)
            session.commit()

            log.info("process_compare_pdf_completed", job_id=job_id, output_size=len(out_bytes))

        except Exception as exc:
            log.error("process_compare_pdf_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


# ── Periodic maintenance tasks ─────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.cleanup_temp_files")
def cleanup_temp_files():
    """Securely purge ephemeral files (temp, originals, processed) older than TEMP_FILE_TTL_HOURS."""
    import time
    from pathlib import Path

    cutoff = time.time() - settings.TEMP_FILE_TTL_HOURS * 3600
    deleted = 0
    folders = ["temp", "originals", "processed"]

    for folder_name in folders:
        target_dir = settings.LOCAL_UPLOAD_DIR / folder_name
        if not target_dir.exists():
            continue
        for p in target_dir.glob("*"):
            if p.is_file():
                try:
                    if p.stat().st_mtime < cutoff:
                        p.unlink(missing_ok=True)
                        deleted += 1
                except Exception as e:
                    log.warning("cleanup_file_error", path=str(p), error=str(e))

    log.info("cleanup_temp_files_completed", deleted=deleted, ttl_hours=settings.TEMP_FILE_TTL_HOURS)
    return {"deleted": deleted}


@celery_app.task(name="app.workers.tasks.cleanup_expired_jobs")
def cleanup_expired_jobs():
    """Purge storage files associated with expired jobs older than TTL."""
    from datetime import datetime, timedelta, timezone
    from app.models.job import Job
    from sqlalchemy import select

    cutoff_dt = datetime.now(timezone.utc) - timedelta(hours=settings.TEMP_FILE_TTL_HOURS)
    removed_files = 0

    with SyncSession() as session:
        try:
            stmt = select(Job).where(
                Job.created_at < cutoff_dt,
                Job.status.in_(["completed", "failed", "cancelled"])
            )
            expired_jobs = session.execute(stmt).scalars().all()
            for job in expired_jobs:
                if job.output_storage_key:
                    path = settings.LOCAL_UPLOAD_DIR / job.output_storage_key
                    if path.exists() and path.is_file():
                        path.unlink(missing_ok=True)
                        removed_files += 1
            session.commit()
        except Exception as e:
            session.rollback()
            log.warning("cleanup_expired_jobs_failed", error=str(e))

    log.info("cleanup_expired_jobs_completed", files_removed=removed_files)
    return {"files_removed": removed_files}
