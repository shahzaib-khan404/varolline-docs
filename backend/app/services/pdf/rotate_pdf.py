"""
PDF page rotation.

Options:
  angle  — degrees clockwise to add: 90, 180, or 270
  pages  — "all" | "odd" | "even" | comma/range string (1-indexed, e.g. "1,3,5-8")
"""

from __future__ import annotations

import structlog

log = structlog.get_logger(__name__)


def rotate_pdf(pdf_bytes: bytes, *, angle: int = 90, pages: str = "all") -> bytes:
    """Rotate selected pages of *pdf_bytes* by *angle* degrees clockwise."""
    import fitz

    angle = angle % 360
    if angle not in (90, 180, 270):
        raise ValueError(f"Unsupported rotation angle: {angle}. Use 90, 180, or 270.")

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total = doc.page_count
        page_set = _parse_page_set(pages, total)

        log.info("rotate_pdf_start", total_pages=total, rotate_count=len(page_set), angle=angle)

        for idx in page_set:
            page = doc[idx]
            new_rot = (page.rotation + angle) % 360
            page.set_rotation(new_rot)

        result = doc.tobytes(garbage=4, deflate=True)

    log.info("rotate_pdf_done", size=len(result))
    return result


# ── page-set parser ───────────────────────────────────────────────────────────


def _parse_page_set(spec: str, total: int) -> list[int]:
    """Return a sorted list of 0-based page indices for the given *spec*."""
    spec = spec.strip().lower()

    if spec == "all":
        return list(range(total))
    if spec == "odd":
        return list(range(0, total, 2))   # pages 1,3,5,… → indices 0,2,4,…
    if spec == "even":
        return list(range(1, total, 2))   # pages 2,4,6,… → indices 1,3,5,…

    # Comma-separated values / ranges (1-indexed from user)
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

    return sorted(indices)
