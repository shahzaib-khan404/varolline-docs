"""
OCR text extraction from PDFs.

Strategy:
  1. For each selected page, attempt PyMuPDF text extraction first.
     If the page yields substantial text it is a native PDF — use the text directly.
  2. For image-only pages (scanned), render the page to a PIL image and pass
     it to Tesseract via pytesseract.
  3. Output is either a searchable PDF (Tesseract's hOCR → PDF layer merged back)
     or a plain .txt file, depending on the `output_format` option.

System requirement:
  Tesseract must be installed for scanned PDFs:
    macOS:  brew install tesseract
    Debian: sudo apt install tesseract-ocr

Tesseract is NOT needed when all selected pages already contain embedded text.
"""

from __future__ import annotations

import io
import shutil

import structlog

log = structlog.get_logger(__name__)

# Minimum characters extracted by PyMuPDF to consider a page "native"
_NATIVE_TEXT_THRESHOLD = 20

# Common Tesseract installation paths (macOS Homebrew + Linux)
_TESSERACT_CANDIDATES = [
    "/opt/homebrew/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/usr/bin/tesseract",
]


def ocr_pdf(
    pdf_bytes: bytes,
    *,
    output_format: str = "txt",
    language: str = "eng",
    pages: str = "all",
    dpi: int = 200,
) -> bytes:
    """
    Extract text from *pdf_bytes* using OCR where needed.

    Returns:
      - ``output_format="txt"``  → UTF-8 encoded plain-text bytes
      - ``output_format="pdf"``  → searchable PDF bytes (text layer over images)
    """
    import fitz

    output_format = output_format.lower()
    if output_format not in ("txt", "pdf"):
        raise ValueError(f"Unsupported output format: {output_format!r}. Use 'txt' or 'pdf'.")

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total = doc.page_count
        page_set = _parse_page_set(pages, total)

        log.info("ocr_start", total=total, processing=len(page_set),
                 output_format=output_format, lang=language)

        if output_format == "txt":
            return _extract_text(doc, page_set, language, dpi)
        else:
            return _extract_searchable_pdf(doc, page_set, language, dpi, pdf_bytes)


# ── text output ───────────────────────────────────────────────────────────────


def _extract_text(doc, page_set: list[int], language: str, dpi: int) -> bytes:
    parts: list[str] = []

    for idx in page_set:
        page = doc[idx]
        native_text = page.get_text("text").strip()

        if len(native_text) >= _NATIVE_TEXT_THRESHOLD:
            log.debug("ocr_native_page", page=idx + 1, chars=len(native_text))
            parts.append(f"--- Page {idx + 1} ---\n{native_text}")
        else:
            log.debug("ocr_scan_page", page=idx + 1)
            img = _page_to_pil(page, dpi)
            text = _tesseract_text(img, language)
            parts.append(f"--- Page {idx + 1} ---\n{text}")

    result = "\n\n".join(parts)
    log.info("ocr_text_done", chars=len(result))
    return result.encode("utf-8")


# ── searchable PDF output ─────────────────────────────────────────────────────


def _extract_searchable_pdf(
    doc, page_set: list[int], language: str, dpi: int, original_bytes: bytes
) -> bytes:
    import fitz

    # Build a new PDF page-by-page
    out_doc = fitz.open()

    for page_idx in range(doc.page_count):
        src_page = doc[page_idx]

        if page_idx not in page_set:
            # Copy page as-is
            out_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
            continue

        native_text = src_page.get_text("text").strip()

        if len(native_text) >= _NATIVE_TEXT_THRESHOLD:
            # Native page — copy as-is, text is already searchable
            out_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
        else:
            # Scanned page — OCR and overlay text layer
            img = _page_to_pil(src_page, dpi)
            page_pdf_bytes = _tesseract_pdf(img, language)

            # Merge Tesseract's single-page PDF into output
            with fitz.open(stream=page_pdf_bytes, filetype="pdf") as t_doc:
                out_doc.insert_pdf(t_doc)

    result = out_doc.tobytes(garbage=4, deflate=True)
    out_doc.close()
    log.info("ocr_pdf_done", size=len(result))
    return result


# ── Tesseract helpers ─────────────────────────────────────────────────────────


def _get_tesseract_cmd() -> str:
    """Return the Tesseract binary path, or raise RuntimeError."""
    # Check PATH first
    in_path = shutil.which("tesseract")
    if in_path:
        return in_path
    for candidate in _TESSERACT_CANDIDATES:
        if shutil.which(candidate) or _file_exists(candidate):
            return candidate
    raise RuntimeError(
        "Tesseract is not installed. Install it with:\n"
        "  macOS:  brew install tesseract\n"
        "  Debian: sudo apt install tesseract-ocr\n"
        "Then restart the worker."
    )


def _file_exists(path: str) -> bool:
    import os
    return os.path.isfile(path)


def _configure_tesseract() -> None:
    import pytesseract
    cmd = _get_tesseract_cmd()
    pytesseract.pytesseract.tesseract_cmd = cmd


def _tesseract_text(img, language: str) -> str:
    import pytesseract
    _configure_tesseract()
    return pytesseract.image_to_string(img, lang=language)


def _tesseract_pdf(img, language: str) -> bytes:
    import pytesseract
    _configure_tesseract()
    return pytesseract.image_to_pdf_or_hocr(img, lang=language, extension="pdf")


# ── image rendering ───────────────────────────────────────────────────────────


def _page_to_pil(page, dpi: int):
    """Render a PyMuPDF page to a PIL Image."""
    from PIL import Image
    import fitz

    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    del pix
    return img


# ── page-set parser ───────────────────────────────────────────────────────────


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
            lo, hi = part.split("-", 1)
            for i in range(int(lo.strip()) - 1, int(hi.strip())):
                if 0 <= i < total:
                    indices.add(i)
        else:
            i = int(part) - 1
            if 0 <= i < total:
                indices.add(i)
    return sorted(indices)
