"""
PDF page deletion.

Options:
  pages — comma/range string of 1-indexed page numbers to remove (e.g. "1,3,5-8")
          Also accepts "odd" and "even" as shortcuts.

The function raises ValueError if the operation would delete all pages.
"""

from __future__ import annotations

import structlog

log = structlog.get_logger(__name__)


def delete_pages(pdf_bytes: bytes, *, pages: str) -> bytes:
    """Return *pdf_bytes* with the specified pages removed."""
    import fitz

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total = doc.page_count
        to_delete = _parse_page_set(pages, total)

        if not to_delete:
            raise ValueError("No valid pages specified for deletion.")
        if len(to_delete) >= total:
            raise ValueError("Cannot delete all pages — at least one page must remain.")

        log.info("delete_pages_start", total=total, removing=len(to_delete))

        # Delete in reverse order so earlier indices stay valid
        for idx in sorted(to_delete, reverse=True):
            doc.delete_page(idx)

        result = doc.tobytes(garbage=4, deflate=True)

    log.info("delete_pages_done", remaining=total - len(to_delete), size=len(result))
    return result


def _parse_page_set(spec: str, total: int) -> list[int]:
    """Return sorted 0-based indices from a 1-indexed spec string."""
    spec = spec.strip().lower()

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
