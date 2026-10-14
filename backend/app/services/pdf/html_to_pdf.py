"""
HTML → PDF conversion service.

Engine: PyMuPDF fitz.Story native HTML & CSS layout engine with DocumentWriter.
Compiles HTML documents into styled multi-page PDF files with CSS support.
"""

from __future__ import annotations

import io
import structlog
import fitz

log = structlog.get_logger(__name__)


def html_to_pdf(html_bytes: bytes, *, page_size: str = "A4", margin: float = 36.0) -> bytes:
    """Convert HTML bytes to PDF bytes."""
    html_text = html_bytes.decode("utf-8", errors="replace").strip()
    log.info("html_to_pdf_start", length=len(html_text), page_size=page_size)

    # Clean markdown fences if user uploaded markdown-wrapped HTML (e.g. ```html ... ```)
    if html_text.startswith("```"):
        lines = html_text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        html_text = "\n".join(lines).strip()

    # Standard paper geometries
    p_size = (page_size or "A4").upper()
    if p_size == "LETTER":
        mediabox = fitz.paper_rect("letter")
    elif p_size == "LEGAL":
        mediabox = fitz.paper_rect("legal")
    else:
        mediabox = fitz.paper_rect("a4")

    # Content body area with margins
    m = max(10.0, float(margin or 36.0))
    content_rect = fitz.Rect(
        mediabox.x0 + m,
        mediabox.y0 + m,
        mediabox.x1 - m,
        mediabox.y1 - m,
    )

    buf = io.BytesIO()
    writer = fitz.DocumentWriter(buf)
    story = fitz.Story(html_text)

    def rectfn(rect_num, filled):
        return (mediabox, content_rect, None)

    story.write(writer, rectfn)
    writer.close()
    buf.seek(0)
    result = buf.read()

    log.info("html_to_pdf_done", output_size=len(result))
    return result
