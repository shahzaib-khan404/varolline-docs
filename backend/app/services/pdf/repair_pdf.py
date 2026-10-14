"""
PDF Repair service — rebuilds corrupted XREF tables, damaged trailers, and malformed streams.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import structlog
import fitz

log = structlog.get_logger(__name__)


def repair_pdf(pdf_bytes: bytes) -> bytes:
    """
    Repair a corrupt or malformed PDF file using multi-stage reconstruction:
    1. Ghostscript pdfwrite reconstruction (if gs is installed).
    2. PyMuPDF clean stream rebuild (C-level MuPDF error recovery).
    """
    log.info("repair_pdf_start", initial_size=len(pdf_bytes))

    # Stage 1: Try Ghostscript if available
    gs_binary = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    if gs_binary:
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                in_path = os.path.join(tmp_dir, "corrupt.pdf")
                out_path = os.path.join(tmp_dir, "repaired.pdf")
                with open(in_path, "wb") as f:
                    f.write(pdf_bytes)

                cmd = [
                    gs_binary,
                    "-o",
                    out_path,
                    "-sDEVICE=pdfwrite",
                    "-dPDFSETTINGS=/default",
                    "-dCompatibilityLevel=1.7",
                    in_path,
                ]
                res = subprocess.run(cmd, capture_output=True, timeout=60)
                if res.returncode == 0 and os.path.exists(out_path):
                    with open(out_path, "rb") as f:
                        repaired = f.read()
                    if len(repaired) > 0:
                        log.info("repair_pdf_gs_success", output_size=len(repaired))
                        return repaired
        except Exception as e:
            log.warning("repair_pdf_gs_failed_fallback_to_mupdf", error=str(e))

    # Stage 2: PyMuPDF MuPDF error recovery & clean stream rebuild
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            if doc.page_count == 0:
                raise ValueError("Could not recover any pages from this corrupted document.")

            # clean=True rebuilds structure, garbage=4 removes unreferenced objects, deflate=True compresses
            result = doc.tobytes(garbage=4, deflate=True, clean=True, linear=True)
            log.info("repair_pdf_mupdf_success", pages=doc.page_count, output_size=len(result))
            return result
    except Exception as e:
        log.error("repair_pdf_all_stages_failed", error=str(e))
        raise ValueError(f"Unable to repair corrupted PDF: {e}") from e
