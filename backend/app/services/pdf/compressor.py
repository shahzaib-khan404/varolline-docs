"""PDF compression service — Ghostscript primary, PyMuPDF fallback."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import structlog

log = structlog.get_logger(__name__)

# Maps UI preset names to Ghostscript -dPDFSETTINGS values
_GS_PRESETS: dict[str, str] = {
    "screen":   "/screen",    # 72 dpi  — screen viewing, smallest file
    "ebook":    "/ebook",     # 150 dpi — balanced (default)
    "printer":  "/printer",   # 300 dpi — high-quality print
    "prepress": "/prepress",  # 300 dpi — prepress, colour-managed
}


def compress_pdf(pdf_bytes: bytes, quality: str = "ebook") -> bytes:
    """
    Compress *pdf_bytes* and return compressed bytes.

    If the result is larger than the input (can happen with already-compressed
    or very small PDFs) the original bytes are returned unchanged.

    Ghostscript is tried first; if the binary is not on PATH, PyMuPDF is used
    as a fallback (less effective for image-heavy PDFs but always available).
    """
    if quality not in _GS_PRESETS:
        raise ValueError(
            f"Unknown quality preset {quality!r}. "
            f"Choose from: {', '.join(_GS_PRESETS)}"
        )

    try:
        compressed = _compress_gs(pdf_bytes, quality)
        method = "ghostscript"
    except FileNotFoundError:
        log.warning("gs_not_found_falling_back_to_pymupdf")
        compressed = _compress_pymupdf(pdf_bytes)
        method = "pymupdf"

    if len(compressed) >= len(pdf_bytes):
        log.info(
            "compress_pdf_no_gain",
            method=method,
            original=len(pdf_bytes),
            compressed=len(compressed),
        )
        return pdf_bytes  # never return a larger file

    ratio = round((1 - len(compressed) / len(pdf_bytes)) * 100, 1)
    log.info(
        "compress_pdf_done",
        method=method,
        original=len(pdf_bytes),
        compressed=len(compressed),
        reduction_pct=ratio,
    )
    return compressed


# ── Ghostscript ───────────────────────────────────────────────────────────────

def _compress_gs(pdf_bytes: bytes, quality: str) -> bytes:
    preset = _GS_PRESETS[quality]

    with tempfile.TemporaryDirectory() as tmp:
        inp = Path(tmp) / "in.pdf"
        out = Path(tmp) / "out.pdf"
        inp.write_bytes(pdf_bytes)

        cmd = [
            "gs",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS={preset}",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            f"-sOutputFile={out}",
            str(inp),
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=120,
        )

        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")[:400]
            raise RuntimeError(f"Ghostscript error (rc={result.returncode}): {stderr}")

        if not out.exists() or out.stat().st_size == 0:
            raise RuntimeError("Ghostscript produced an empty output file.")

        return out.read_bytes()


# ── PyMuPDF fallback ──────────────────────────────────────────────────────────

def _compress_pymupdf(pdf_bytes: bytes) -> bytes:
    """Light compression using PyMuPDF — removes dead objects and deflates streams."""
    import fitz

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        return doc.tobytes(
            garbage=4,    # remove all unreferenced objects
            deflate=True, # compress all streams
            clean=True,   # sanitise content streams
        )
