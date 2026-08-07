"""
PDF text watermark.

Strategy:
  - ReportLab creates a single-page PDF per unique page size with the
    watermark text centered, rotated, and rendered at the requested opacity.
  - PyMuPDF overlays that watermark page onto each target page via
    show_pdf_page(), which honours PDF transparency groups correctly.

Options:
  text      — watermark string (e.g. "CONFIDENTIAL")
  angle     — counter-clockwise rotation in degrees (default 45)
  color     — hex colour string (default "#808080")
  opacity   — 0.0–1.0 (default 0.3)
  font_size — override auto-sizing (points)
  pages     — "all" | "odd" | "even" | 1-indexed comma/range spec
"""

from __future__ import annotations

import io
import math
from functools import lru_cache

import structlog

log = structlog.get_logger(__name__)


def watermark_pdf(
    pdf_bytes: bytes,
    *,
    text: str,
    angle: float = 45.0,
    color: str = "#808080",
    opacity: float = 0.3,
    font_size: float | None = None,
    pages: str = "all",
) -> bytes:
    """Return *pdf_bytes* with a text watermark applied to the selected pages."""
    import fitz

    if not text.strip():
        raise ValueError("Watermark text must not be empty.")
    opacity = max(0.05, min(1.0, opacity))
    r, g, b = _parse_hex_color(color)

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total = doc.page_count
        page_set = _parse_page_set(pages, total)

        log.info("watermark_pdf_start", total=total, marking=len(page_set), text=text)

        # Cache watermark PDFs per unique page size (most docs use one size)
        wm_cache: dict[tuple[float, float], bytes] = {}

        for idx in page_set:
            page = doc[idx]
            rect = page.rect
            key = (round(rect.width, 1), round(rect.height, 1))

            if key not in wm_cache:
                fs = font_size or _auto_font_size(rect.width, rect.height, text, angle)
                wm_cache[key] = _make_watermark_page(
                    text=text,
                    width=rect.width,
                    height=rect.height,
                    angle=angle,
                    rgb=(r / 255, g / 255, b / 255),
                    opacity=opacity,
                    font_size=fs,
                )

            wm_bytes = wm_cache[key]
            with fitz.open(stream=wm_bytes, filetype="pdf") as wm_doc:
                page.show_pdf_page(rect, wm_doc, 0, overlay=True)

        result = doc.tobytes(garbage=4, deflate=True)

    log.info("watermark_pdf_done", size=len(result))
    return result


# ── watermark page builder ────────────────────────────────────────────────────


def _make_watermark_page(
    *,
    text: str,
    width: float,
    height: float,
    angle: float,
    rgb: tuple[float, float, float],
    opacity: float,
    font_size: float,
) -> bytes:
    """Return a PDF page (as bytes) with transparent centered rotated text."""
    from reportlab.lib.colors import Color
    from reportlab.pdfgen import canvas as rl_canvas

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(width, height))

    # Transparent fill — ReportLab Color alpha maps to PDF ca/CA operators
    c.setFillColor(Color(rgb[0], rgb[1], rgb[2], alpha=opacity))
    c.setFont("Helvetica-Bold", font_size)

    # Move origin to page centre, rotate, then draw centred on origin
    c.translate(width / 2, height / 2)
    c.rotate(angle)
    c.drawCentredString(0, 0, text)

    c.save()
    return buf.getvalue()


# ── helpers ───────────────────────────────────────────────────────────────────


def _auto_font_size(width: float, height: float, text: str, angle: float) -> float:
    """Pick a font size so the text spans ~60 % of the page diagonal."""
    diag = math.sqrt(width**2 + height**2)
    # Rough Helvetica-Bold char width ≈ 0.6 × font_size
    target_width = diag * 0.60
    chars = max(len(text), 1)
    fs = target_width / (chars * 0.6)
    return max(18.0, min(fs, 120.0))


def _parse_hex_color(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError(f"Invalid hex colour: {hex_color!r}")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _parse_page_set(spec: str, total: int) -> list[int]:
    spec = spec.strip().lower()
    if spec == "all":
        return list(range(total))
    if spec == "odd":
        return list(range(0, total, 2))
    if spec == "even":
        return list(range(1, total, 2))

    indices: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            lo_str, hi_str = part.split("-", 1)
            lo, hi = int(lo_str.strip()) - 1, int(hi_str.strip()) - 1
            for i in range(lo, hi + 1):
                if 0 <= i < total:
                    indices.add(i)
        else:
            i = int(part) - 1
            if 0 <= i < total:
                indices.add(i)
    return sorted(indices)
