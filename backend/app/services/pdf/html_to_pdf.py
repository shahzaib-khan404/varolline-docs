"""
HTML → PDF conversion service with security sanitization.

Engine: PyMuPDF fitz.Story native HTML & CSS layout engine with DocumentWriter.
Compiles HTML documents into styled multi-page PDF files with CSS support.
"""

from __future__ import annotations

import io
import re
import structlog
import fitz

log = structlog.get_logger(__name__)


def sanitize_html_for_pdf(html: str) -> str:
    """
    Sanitize HTML before compiling to PDF:
    - Removes dangerous paired tags (<script>...</script>, <iframe>...</iframe>, <object>, <embed>, <applet>)
    - Removes void tags (<base>, <meta http-equiv>)
    - Blocks file:// protocol and local directory schemes to mitigate SSRF & local file disclosure
    - Strips JavaScript pseudo-protocols and inline event handlers
    """
    # 1. Remove paired tags and their contents
    paired_tags = ["script", "iframe", "object", "embed", "applet"]
    for tag in paired_tags:
        pattern = re.compile(rf"<\s*{tag}[^>]*>.*?<\s*/\s*{tag}\s*>", re.IGNORECASE | re.DOTALL)
        html = pattern.sub("", html)
        # Also clean unclosed or self-closing instances
        pattern_unclosed = re.compile(rf"<\s*{tag}[^>]*>", re.IGNORECASE)
        html = pattern_unclosed.sub("", html)

    # 2. Remove void tags (<base>, <meta ...>)
    html = re.sub(r"<\s*base[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<\s*meta\s+http-equiv[^>]*>", "", html, flags=re.IGNORECASE)

    # 3. Block file:// and other raw protocols in any attribute
    html = re.sub(
        r'''(?i)(src|href|url)\s*=\s*['"]?\s*(?:file|gopher|dict|php|jar):[^\s'">]+''',
        r'\1="#"',
        html,
    )

    # 4. Block inline javascript: event attributes
    html = re.sub(r'''(?i)\son\w+\s*=\s*['"][^'"]*['"]''', "", html)
    html = re.sub(r'''(?i)(src|href)\s*=\s*['"]\s*javascript:[^'"]*['"]''', r'\1="#"', html)

    return html


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

    # Sanitize against SSRF and local file disclosures
    html_text = sanitize_html_for_pdf(html_text)

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
