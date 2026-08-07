"""PDF merge service — uses PyMuPDF (fitz) for in-memory merging."""

from __future__ import annotations

import structlog

log = structlog.get_logger(__name__)


def merge_pdfs(pdf_bytes_list: list[bytes]) -> bytes:
    """
    Merge a list of PDFs (as byte strings) into a single PDF.

    Uses PyMuPDF in-memory — no temp files required.
    garbage=4 removes all unreferenced objects; deflate=True re-compresses streams.
    """
    import fitz  # PyMuPDF — imported lazily so the module loads even without fitz installed

    if not pdf_bytes_list:
        raise ValueError("At least one PDF is required.")

    output = fitz.open()
    try:
        for i, data in enumerate(pdf_bytes_list):
            try:
                with fitz.open(stream=data, filetype="pdf") as doc:
                    page_count = doc.page_count
                    output.insert_pdf(doc)
                    log.debug("merge_pdf_inserted", index=i, pages=page_count)
            except Exception as exc:
                raise ValueError(
                    f"PDF {i + 1} is invalid or corrupted: {exc}"
                ) from exc

        merged = output.tobytes(garbage=4, deflate=True)
        log.info(
            "merge_pdf_done",
            source_files=len(pdf_bytes_list),
            total_pages=output.page_count,
            output_bytes=len(merged),
        )
        return merged
    finally:
        output.close()
