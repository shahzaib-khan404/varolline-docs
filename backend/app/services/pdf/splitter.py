"""PDF split service — uses PyMuPDF for page extraction and zipfile for output."""

from __future__ import annotations

import io
import zipfile

import structlog

log = structlog.get_logger(__name__)


# ── Public API ────────────────────────────────────────────────────────────────

def split_pdf(
    pdf_bytes: bytes,
    *,
    base_name: str,
    mode: str,
    ranges: str | None = None,
    n: int | None = None,
) -> bytes:
    """
    Split a PDF and return the result as an in-memory ZIP file.

    Modes
    -----
    all      — one PDF per page
    ranges   — page ranges like "1-3, 5, 7-9" (1-indexed, inclusive)
    every_n  — consecutive chunks of *n* pages
    """
    import fitz

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total = doc.page_count
        if total == 0:
            raise ValueError("The PDF contains no pages.")

        if mode == "all":
            parts = _split_all(doc, base_name)
        elif mode == "ranges":
            if not ranges or not ranges.strip():
                raise ValueError("Page ranges must be provided.")
            groups = _parse_ranges(ranges, total)
            if not groups:
                raise ValueError(
                    "No valid page ranges found. "
                    f"The document has {total} page(s)."
                )
            parts = _split_by_ranges(doc, groups, base_name)
        elif mode == "every_n":
            n = int(n or 1)
            if n < 1:
                raise ValueError("Pages per chunk must be at least 1.")
            parts = _split_every_n(doc, n, base_name)
        else:
            raise ValueError(f"Unknown split mode: {mode!r}")

    log.info("split_pdf_done", mode=mode, parts=len(parts))
    return _create_zip(parts)


# ── Private helpers ───────────────────────────────────────────────────────────

def _extract_pages(doc, page_indices: list[int]) -> bytes:
    """Extract the given 0-based page indices from *doc* into a new PDF bytes."""
    import fitz

    out = fitz.open()
    try:
        for idx in page_indices:
            out.insert_pdf(doc, from_page=idx, to_page=idx)
        return out.tobytes(garbage=4, deflate=True)
    finally:
        out.close()


def _split_all(doc, base_name: str) -> dict[str, bytes]:
    parts: dict[str, bytes] = {}
    for i in range(doc.page_count):
        data = _extract_pages(doc, [i])
        filename = f"{base_name}_page_{i + 1:04d}.pdf"
        parts[filename] = data
    return parts


def _parse_ranges(range_str: str, total: int) -> list[list[int]]:
    """
    Parse a human-readable range string into groups of 0-based page indices.

    "1-3, 5, 7-9"  →  [[0,1,2], [4], [6,7,8]]
    Pages out of range are clamped/skipped.
    """
    groups: list[list[int]] = []
    for segment in range_str.split(","):
        segment = segment.strip()
        if not segment:
            continue
        if "-" in segment:
            raw = segment.split("-", 1)
            try:
                start = max(0, int(raw[0].strip()) - 1)
                end = min(total - 1, int(raw[1].strip()) - 1)
            except ValueError:
                continue
            if start > end or start >= total:
                continue
            groups.append(list(range(start, end + 1)))
        else:
            try:
                page = int(segment) - 1
            except ValueError:
                continue
            if 0 <= page < total:
                groups.append([page])
    return groups


def _split_by_ranges(
    doc,
    groups: list[list[int]],
    base_name: str,
) -> dict[str, bytes]:
    parts: dict[str, bytes] = {}
    for group in groups:
        data = _extract_pages(doc, group)
        if len(group) == 1:
            label = f"page_{group[0] + 1:04d}"
        else:
            label = f"pages_{group[0] + 1:04d}-{group[-1] + 1:04d}"
        filename = f"{base_name}_{label}.pdf"
        parts[filename] = data
    return parts


def _split_every_n(doc, n: int, base_name: str) -> dict[str, bytes]:
    parts: dict[str, bytes] = {}
    total = doc.page_count
    chunk = 1
    for start in range(0, total, n):
        end = min(start + n - 1, total - 1)
        data = _extract_pages(doc, list(range(start, end + 1)))
        filename = f"{base_name}_part_{chunk:03d}.pdf"
        parts[filename] = data
        chunk += 1
    return parts


def _create_zip(parts: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts.items():
            zf.writestr(name, data)
    return buf.getvalue()
