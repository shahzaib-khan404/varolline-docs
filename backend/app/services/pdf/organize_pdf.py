"""
PDF Organize service — reorder, rotate, delete, insert pages, and combine multi-document flows.
Reverse engineered from iLovePDF Organize PDF standard.
"""

from __future__ import annotations

from typing import Any
import structlog
try:
    import pymupdf as fitz
except ImportError:
    import fitz

log = structlog.get_logger(__name__)


def organize_pdf(
    pdf_bytes: bytes,
    *,
    pages: list[dict[str, Any]] | None = None,
    page_order: list[int] | None = None,
    delete_pages: list[int] | None = None,
    rotations: dict[str | int, int] | None = None,
    insert_pdf_bytes_list: list[bytes] | None = None,
) -> bytes:
    """
    Reorder, rotate, remove, or append pages on one or multiple PDF documents.
    
    Args:
        pdf_bytes: Raw bytes of the main input PDF.
        pages: List of page descriptors representing the exact ordered document:
               [{"file_idx": 0, "page_idx": 0, "rotation": 90}, {"type": "blank"}, ...]
        page_order: Legacy list of 0-based page indices specifying the new order.
        delete_pages: 0-based page indices to remove before reordering.
        rotations: Mapping of 0-based page index to rotation angle (90, 180, 270).
        insert_pdf_bytes_list: Additional PDF bytes from secondary uploaded files.
    """
    log.info("organize_pdf_start", initial_size=len(pdf_bytes), has_custom_pages=bool(pages))

    all_raw_docs = [pdf_bytes]
    if insert_pdf_bytes_list:
        all_raw_docs.extend(insert_pdf_bytes_list)

    opened_docs: list[fitz.Document] = []
    try:
        for b in all_raw_docs:
            d = fitz.open(stream=b, filetype="pdf")
            if d.is_encrypted:
                d.authenticate("")
            opened_docs.append(d)

        # Mode A: Modern unified page sequence (exact iLovePDF visual canvas layout)
        if pages is not None and len(pages) > 0:
            out_doc = fitz.open()
            for item in pages:
                # 1. Blank page insertion
                if item.get("type") == "blank":
                    # Match dimensions of first document if available, else standard A4
                    w, h = 595, 842
                    if len(opened_docs) > 0 and len(opened_docs[0]) > 0:
                        rect = opened_docs[0][0].rect
                        w, h = rect.width, rect.height
                    out_doc.new_page(width=w, height=h)
                    continue

                # 2. Existing page insertion
                file_idx = int(item.get("file_idx", 0))
                page_idx = int(item.get("page_idx", 0))
                rot = int(item.get("rotation", 0))

                if 0 <= file_idx < len(opened_docs):
                    src_doc = opened_docs[file_idx]
                    if 0 <= page_idx < len(src_doc):
                        out_doc.insert_pdf(src_doc, from_page=page_idx, to_page=page_idx)
                        if rot % 360 != 0:
                            target_p = out_doc[-1]
                            target_p.set_rotation((target_p.rotation + rot) % 360)

            if len(out_doc) == 0:
                raise ValueError("Organized document resulted in 0 pages.")

            result = out_doc.tobytes(garbage=4, deflate=True)
            out_doc.close()
            log.info("organize_pdf_done_pages_mode", total_pages=len(pages), output_size=len(result))
            return result

        # Mode B: Index-based reordering and transformation
        main_doc = opened_docs[0]
        # Append secondary documents
        if len(opened_docs) > 1:
            for extra_doc in opened_docs[1:]:
                main_doc.insert_pdf(extra_doc)

        total = main_doc.page_count
        if total == 0:
            raise ValueError("Input PDF contains no pages.")

        # Delete specified pages
        if delete_pages and not page_order:
            delete_set = {int(p) for p in delete_pages if 0 <= int(p) < total}
            if len(delete_set) >= total:
                raise ValueError("Cannot delete all pages — at least one page must remain.")
            for pno in sorted(delete_set, reverse=True):
                main_doc.delete_page(pno)
            total = main_doc.page_count

        # Apply custom page order
        if page_order:
            valid_order = [int(p) for p in page_order if 0 <= int(p) < total]
            if not valid_order:
                raise ValueError("No valid pages provided in page order.")
            main_doc.select(valid_order)
            total = main_doc.page_count

        # Apply rotations
        if rotations:
            for p_str, angle in rotations.items():
                try:
                    pno = int(p_str)
                    if 0 <= pno < total:
                        current_rot = main_doc[pno].rotation
                        main_doc[pno].set_rotation((current_rot + int(angle)) % 360)
                except Exception as e:
                    log.warning("organize_pdf_rotation_skipped", page=p_str, error=str(e))

        result = main_doc.tobytes(garbage=4, deflate=True)
        log.info("organize_pdf_done_legacy_mode", final_pages=total, output_size=len(result))
        return result

    finally:
        for d in opened_docs:
            try:
                d.close()
            except Exception:
                pass
