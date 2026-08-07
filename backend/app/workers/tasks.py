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
sync_engine = create_engine(
    settings.DATABASE_URL.replace("+asyncpg", ""),
    pool_pre_ping=True,
)
SyncSession = sessionmaker(bind=sync_engine, expire_on_commit=False)


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
        }

        task_fn = tool_map.get(job.tool)
        if not task_fn:
            job.status = "failed"
            job.error_message = f"Unknown tool: {job.tool}"
            session.commit()
            return

    # Chain to the specific tool task
    task_fn.delay(job_id)


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
            log.error("process_delete_pages_failed", job_id=job_id, error=str(exc), exc_info=True)
            try:
                job.status = "failed"
                job.error_message = str(exc)[:500]
                session.commit()
            except Exception:
                session.rollback()


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


# ── Periodic maintenance tasks ─────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.cleanup_temp_files")
def cleanup_temp_files():
    """Delete temp files older than TEMP_FILE_TTL_HOURS."""
    import time
    from pathlib import Path

    temp_dir = settings.LOCAL_UPLOAD_DIR / "temp"
    cutoff = time.time() - settings.TEMP_FILE_TTL_HOURS * 3600
    deleted = 0
    for p in temp_dir.glob("*"):
        if p.stat().st_mtime < cutoff:
            p.unlink(missing_ok=True)
            deleted += 1
    log.info("cleanup_temp_files", deleted=deleted)


@celery_app.task(name="app.workers.tasks.cleanup_expired_jobs")
def cleanup_expired_jobs():
    """Mark old completed/failed jobs and their files for deletion."""
    log.info("cleanup_expired_jobs_placeholder")
