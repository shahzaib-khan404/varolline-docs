"""
Admin Tools Management endpoints.
Returns all platform tools, engine status, real execution counts, and health.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.models.job import Job

router = APIRouter()

TOOL_DEFINITIONS = [
    {"id": "merge_pdf", "name": "Merge PDF", "category": "organize", "description": "Combine multiple PDF files into one unified document", "route": "/tools/merge-pdf"},
    {"id": "split_pdf", "name": "Split PDF", "category": "organize", "description": "Extract specific pages or separate PDF files", "route": "/tools/split-pdf"},
    {"id": "compress_pdf", "name": "Compress PDF", "category": "optimize", "description": "Reduce file size with maximum visual preservation", "route": "/tools/compress-pdf"},
    {"id": "pdf_to_word", "name": "PDF to Word", "category": "convert", "description": "Convert PDF documents to editable Microsoft Word files", "route": "/tools/pdf-to-word"},
    {"id": "word_to_pdf", "name": "Word to PDF", "category": "convert", "description": "Convert Word documents to standard PDF format", "route": "/tools/word-to-pdf"},
    {"id": "pdf_to_image", "name": "PDF to Image", "category": "convert", "description": "Export PDF pages as crisp JPG or PNG images", "route": "/tools/pdf-to-image"},
    {"id": "image_to_pdf", "name": "Image to PDF", "category": "convert", "description": "Transform images into a multi-page PDF document", "route": "/tools/image-to-pdf"},
    {"id": "protect_pdf", "name": "Protect PDF", "category": "security", "description": "Encrypt PDF documents with 256-bit AES password security", "route": "/tools/protect-pdf"},
    {"id": "unlock_pdf", "name": "Unlock PDF", "category": "security", "description": "Remove password restrictions and security locks from PDF", "route": "/tools/unlock-pdf"},
    {"id": "rotate_pdf", "name": "Rotate PDF", "category": "organize", "description": "Rotate PDF pages clockwise or counter-clockwise", "route": "/tools/rotate-pdf"},
    {"id": "page_numbers", "name": "Page Numbers", "category": "organize", "description": "Insert customized pagination and headers into PDF", "route": "/tools/page-numbers"},
    {"id": "watermark_pdf", "name": "Watermark PDF", "category": "security", "description": "Apply custom image or text copyright watermarks to PDF", "route": "/tools/watermark-pdf"},
]


@router.get("")
async def list_admin_tools(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Return all platform tools with live DB execution statistics."""
    # Query job execution counts grouped by tool
    counts_res = await db.execute(
        select(Job.tool, Job.status, func.count(Job.id)).group_by(Job.tool, Job.status)
    )
    
    # Aggregate counts by tool id (handling both underscore and hyphen forms)
    tool_stats: dict[str, dict[str, int]] = {}
    for tool_name, status_val, count in counts_res.all():
        normalized = tool_name.replace("-", "_")
        if normalized not in tool_stats:
            tool_stats[normalized] = {"total": 0, "completed": 0, "failed": 0}
        tool_stats[normalized]["total"] += count
        if status_val == "completed":
            tool_stats[normalized]["completed"] += count
        elif status_val == "failed":
            tool_stats[normalized]["failed"] += count

    total_platform_jobs = sum(s["total"] for s in tool_stats.values())

    tools_data = []
    for tool in TOOL_DEFINITIONS:
        tid = tool["id"]
        stats = tool_stats.get(tid, {"total": 0, "completed": 0, "failed": 0})
        tools_data.append({
            **tool,
            "status": "operational",
            "total_runs": stats["total"],
            "completed_runs": stats["completed"],
            "failed_runs": stats["failed"],
            "success_rate": round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 100.0,
        })

    return {
        "tools": tools_data,
        "total_tools": len(tools_data),
        "total_platform_runs": total_platform_jobs,
        "engine_status": "active",
    }
