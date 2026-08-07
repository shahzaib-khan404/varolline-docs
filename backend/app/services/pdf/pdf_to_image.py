"""PDF → image conversion using PyMuPDF — no poppler dependency required."""

from __future__ import annotations

import io
import zipfile

import structlog

log = structlog.get_logger(__name__)

_SUPPORTED_FORMATS = {"png", "jpeg", "jpg"}


def pdf_to_images(
    pdf_bytes: bytes,
    *,
    fmt: str = "png",
    dpi: int = 150,
) -> bytes:
    """
    Render every page of *pdf_bytes* to an image and return them as a ZIP.

    Parameters
    ----------
    fmt:  "png" (lossless) or "jpg"/"jpeg" (smaller, lossy)
    dpi:  render resolution — 72 (screen), 150 (standard), 300 (high)
    """
    import fitz

    fmt = fmt.lower()
    if fmt == "jpg":
        fmt = "jpeg"
    if fmt not in ("png", "jpeg"):
        raise ValueError(f"Unsupported image format {fmt!r}. Use 'png' or 'jpg'.")

    if dpi < 36 or dpi > 600:
        raise ValueError("DPI must be between 36 and 600.")

    ext = "jpg" if fmt == "jpeg" else "png"
    # PyMuPDF scale matrix: 1 pt = 1/72 inch, so scale = dpi/72
    mat = fitz.Matrix(dpi / 72, dpi / 72)

    parts: dict[str, bytes] = {}

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        if doc.page_count == 0:
            raise ValueError("The PDF has no pages.")

        log.info(
            "pdf_to_images_start",
            pages=doc.page_count,
            fmt=fmt,
            dpi=dpi,
        )

        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes(fmt)
            parts[f"page_{i + 1:04d}.{ext}"] = img_bytes
            del pix  # explicit release — pixmaps can be large

    log.info("pdf_to_images_done", parts=len(parts))
    return _create_zip(parts)


def _create_zip(parts: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts.items():
            zf.writestr(name, data)
    return buf.getvalue()
