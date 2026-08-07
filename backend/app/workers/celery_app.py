"""Celery application configuration."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "varolline_docs",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    # Queue naming — must match the worker -Q flag
    task_default_queue="default",
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezones
    timezone="UTC",
    enable_utc=True,
    # Task routing
    task_routes={
        "app.workers.tasks.process_pdf_*": {"queue": "pdf"},
        "app.workers.tasks.process_image_*": {"queue": "images"},
        "app.workers.tasks.process_document_*": {"queue": "documents"},
        "app.workers.tasks.cleanup_*": {"queue": "default"},
    },
    # Retry / reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,  # One task at a time per worker thread (heavy I/O)
    task_soft_time_limit=300,  # 5 min soft kill
    task_time_limit=600,        # 10 min hard kill
    task_max_retries=3,
    task_default_retry_delay=30,  # seconds
    # Results
    result_expires=86400,  # 24 hours
    # Beat schedule (periodic tasks)
    beat_schedule={
        "cleanup-temp-files": {
            "task": "app.workers.tasks.cleanup_temp_files",
            "schedule": crontab(minute=0, hour="*/6"),  # Every 6 hours
        },
        "cleanup-expired-jobs": {
            "task": "app.workers.tasks.cleanup_expired_jobs",
            "schedule": crontab(minute=30, hour=2),  # Daily at 02:30
        },
    },
)
