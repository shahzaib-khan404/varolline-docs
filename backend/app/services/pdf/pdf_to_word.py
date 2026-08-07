"""
PDF → DOCX conversion.

Strategy:
  - PyMuPDF extracts text spans with position/font/color data
  - Spans on the same line are merged into one paragraph run-group
  - Large font size → Heading style; body text → Normal style
  - Embedded images are extracted and inserted after their bounding block
"""

from __future__ import annotations

import io

import structlog
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

log = structlog.get_logger(__name__)

# Font size (pt) above which a block is treated as a heading
_HEADING_THRESHOLD_RATIO = 1.4  # ≥ 1.4× the median font size → heading


def pdf_to_word(pdf_bytes: bytes) -> bytes:
    """Convert *pdf_bytes* to a DOCX and return the DOCX bytes."""
    import fitz

    doc = Document()
    # Remove the default blank paragraph Word adds on creation
    _clear_default_paragraph(doc)

    with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
        log.info("pdf_to_word_start", pages=pdf.page_count)

        for page_idx, page in enumerate(pdf):
            if page_idx > 0:
                _add_page_break(doc)

            # ----- collect all spans to compute median font size -----
            page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
            all_sizes = [
                sp["size"]
                for blk in page_dict["blocks"]
                if blk.get("type") == 0
                for ln in blk["lines"]
                for sp in ln["spans"]
                if sp.get("text", "").strip()
            ]
            median_size = _median(all_sizes) if all_sizes else 12.0

            # ----- process blocks in reading order (top→bottom) -----
            blocks = sorted(
                page_dict["blocks"], key=lambda b: (round(b["bbox"][1] / 5) * 5, b["bbox"][0])
            )

            for blk in blocks:
                if blk.get("type") == 1:
                    # Image block
                    _insert_image(doc, pdf, blk)

                elif blk.get("type") == 0:
                    # Text block — one DOCX paragraph per line
                    for line in blk["lines"]:
                        spans = [s for s in line["spans"] if s.get("text")]
                        if not spans:
                            continue

                        avg_size = sum(s["size"] for s in spans) / len(spans)
                        is_heading = avg_size >= median_size * _HEADING_THRESHOLD_RATIO

                        if is_heading:
                            level = _heading_level(avg_size, median_size)
                            para = doc.add_heading("", level=level)
                        else:
                            para = doc.add_paragraph()

                        for span in spans:
                            run = para.add_run(span["text"])
                            _apply_span_style(run, span)

    buf = io.BytesIO()
    doc.save(buf)
    log.info("pdf_to_word_done", size=buf.tell())
    return buf.getvalue()


# ── helpers ───────────────────────────────────────────────────────────────────


def _clear_default_paragraph(doc: Document) -> None:
    if doc.paragraphs:
        p = doc.paragraphs[0]._element
        p.getparent().remove(p)


def _add_page_break(doc: Document) -> None:
    para = doc.add_paragraph()
    run = para.add_run()
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    run._r.append(br)


def _apply_span_style(run, span: dict) -> None:
    flags = span.get("flags", 0)
    run.bold = bool(flags & (1 << 4))
    run.italic = bool(flags & (1 << 1))

    size = span.get("size", 12)
    run.font.size = Pt(max(6, min(size, 72)))

    color_int = span.get("color", 0)
    if color_int:
        r = (color_int >> 16) & 0xFF
        g = (color_int >> 8) & 0xFF
        b = color_int & 0xFF
        run.font.color.rgb = RGBColor(r, g, b)


def _heading_level(size: float, median: float) -> int:
    ratio = size / median
    if ratio >= 2.2:
        return 1
    if ratio >= 1.8:
        return 2
    return 3


def _insert_image(doc: Document, pdf, blk: dict) -> None:
    try:
        xref = blk.get("xref")
        if not xref:
            return
        img_info = pdf.extract_image(xref)
        if not img_info:
            return
        img_bytes = img_info["image"]
        # Clamp width to 6 inches max (page width minus margins)
        bbox = blk["bbox"]
        w_pts = bbox[2] - bbox[0]
        w_in = min(6.0, w_pts / 72)
        doc.add_picture(io.BytesIO(img_bytes), width=Inches(w_in))
    except Exception as exc:
        log.debug("pdf_to_word_image_skip", error=str(exc))


def _median(values: list[float]) -> float:
    if not values:
        return 12.0
    s = sorted(values)
    mid = len(s) // 2
    return (s[mid] + s[~mid]) / 2
