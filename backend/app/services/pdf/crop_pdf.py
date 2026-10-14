"""
PDF Crop service — adjusts page CropBox and MediaBox to trim margins or zoom content.
"""

from __future__ import annotations

import structlog
import fitz

log = structlog.get_logger(__name__)


def crop_pdf(
    pdf_bytes: bytes,
    *,
    margin_top: float = 0.0,
    margin_bottom: float = 0.0,
    margin_left: float = 0.0,
    margin_right: float = 0.0,
    pages: str = "all",
) -> bytes:
    """
    Crop the viewable margins of PDF pages.

    Args:
        pdf_bytes: Raw bytes of the input PDF.
        margin_top: Points to trim from the top edge.
        margin_bottom: Points to trim from the bottom edge.
        margin_left: Points to trim from the left edge.
        margin_right: Points to trim from the right edge.
        pages: "all" or comma/range string of 1-based page numbers (e.g. "1,2-4").
    """
    log.info(
        "crop_pdf_start",
        top=margin_top,
        bottom=margin_bottom,
        left=margin_left,
        right=margin_right,
    )

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total = doc.page_count
        if total == 0:
            raise ValueError("Input PDF contains no pages.")

        target_indices = _parse_target_pages(pages, total)

        for pno in target_indices:
            page = doc[pno]
            rect = page.rect

            # Calculate new cropped boundaries
            new_x0 = rect.x0 + margin_left
            new_y0 = rect.y0 + margin_top
            new_x1 = rect.x1 - margin_right
            new_y1 = rect.y1 - margin_bottom

            if new_x1 <= new_x0 or new_y1 <= new_y0:
                log.warning(
                    "crop_pdf_invalid_dimensions_skipped",
                    page=pno + 1,
                    w=rect.width,
                    h=rect.height,
                )
                continue

            crop_rect = fitz.Rect(new_x0, new_y0, new_x1, new_y1)
            page.set_cropbox(crop_rect)

        result = doc.tobytes(garbage=3, deflate=True)

    log.info("crop_pdf_done", size=len(result))
    return result


def _parse_target_pages(spec: str, total: int) -> list[int]:
    """Parse pages spec into 0-based indices."""
    spec = spec.strip().lower()
    if spec == "all" or not spec:
        return list(range(total))

    indices: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            lo_str, hi_str = part.split("-", 1)
            lo = int(lo_str.strip()) - 1
            hi = int(hi_str.strip()) - 1
            for i in range(lo, hi + 1):
                if 0 <= i < total:
                    indices.add(i)
        else:
            i = int(part) - 1
            if 0 <= i < total:
                indices.add(i)

    return sorted(indices) if indices else list(range(total))
