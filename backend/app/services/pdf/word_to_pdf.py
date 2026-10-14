"""
DOCX → PDF conversion.

Primary strategy: LibreOffice subprocess (works perfectly when installed).
Fallback:         python-docx + ReportLab Platypus.

The ReportLab fallback handles:
  - Normal paragraphs (with bold/italic runs)
  - Heading styles (Heading 1–6)
  - Tables (basic grid, no merged cells)
  - Bulleted lists
  - Numbered lists (list-paragraph style)
  - Font sizes and basic colour
"""

from __future__ import annotations

import io
import os
import shutil
import subprocess
import tempfile

import structlog

log = structlog.get_logger(__name__)


def _find_libreoffice() -> str | None:
    lo = shutil.which("libreoffice") or shutil.which("soffice")
    if lo:
        return lo
    candidates = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        r"C:\Program Files\LibreOffice 7\program\soffice.exe",
        r"C:\Program Files\LibreOffice 24\program\soffice.exe",
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def _windows_com_convert(docx_bytes: bytes) -> bytes:
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    try:
        app = win32com.client.Dispatch("word.application")
        try:
            try:
                app.DisplayAlerts = 0
            except Exception:
                pass
            with tempfile.TemporaryDirectory() as tmp:
                src = os.path.abspath(os.path.join(tmp, "input.docx"))
                out = os.path.abspath(os.path.join(tmp, "output.pdf"))
                with open(src, "wb") as f:
                    f.write(docx_bytes)
                doc = app.Documents.Open(src, ReadOnly=True, Visible=False)
                # 17 = wdExportFormatPDF
                doc.ExportAsFixedFormat(out, 17)
                doc.Close(SaveChanges=False)
                with open(out, "rb") as f:
                    data = f.read()
                log.info("word_to_pdf_com_success", size=len(data))
                return data
        finally:
            try:
                app.Quit()
            except Exception:
                pass
    finally:
        pythoncom.CoUninitialize()


def word_to_pdf(docx_bytes: bytes) -> bytes:
    """Convert *docx_bytes* to PDF and return the PDF bytes."""
    # 1. On Windows, use native Word COM automation
    if os.name == "nt":
        try:
            return _windows_com_convert(docx_bytes)
        except Exception as exc:
            log.warning("word_windows_com_failed_trying_libreoffice", error=str(exc))

    # 2. Try Headless LibreOffice
    lo = _find_libreoffice()
    if lo:
        try:
            return _libreoffice_convert(docx_bytes, lo)
        except Exception as exc:
            log.warning("libreoffice_failed_fallback", error=str(exc))

    return _reportlab_convert(docx_bytes)


# ── LibreOffice path ──────────────────────────────────────────────────────────


def _libreoffice_convert(docx_bytes: bytes, lo_bin: str) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "input.docx")
        with open(src, "wb") as f:
            f.write(docx_bytes)

        subprocess.run(
            [lo_bin, "--headless", "--convert-to", "pdf", "--outdir", tmp, src],
            check=True,
            capture_output=True,
            timeout=60,
        )

        out = os.path.join(tmp, "input.pdf")
        with open(out, "rb") as f:
            data = f.read()
        log.info("word_to_pdf_libreoffice", size=len(data))
        return data


# ── ReportLab fallback ────────────────────────────────────────────────────────

_HEADING_STYLES = {f"heading {i}" for i in range(1, 7)}
_LIST_STYLES = {"list paragraph", "list bullet", "list number"}

_BOLD_FLAG = 1
_ITALIC_FLAG = 2


def _reportlab_convert(docx_bytes: bytes) -> bytes:
    from docx import Document as DocxDoc
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Image,
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )
    from reportlab.platypus.flowables import HRFlowable

    doc = DocxDoc(io.BytesIO(docx_bytes))
    styles = getSampleStyleSheet()
    story: list = []

    _ALIGN_MAP = {
        WD_ALIGN_PARAGRAPH.LEFT: TA_LEFT,
        WD_ALIGN_PARAGRAPH.CENTER: TA_CENTER,
        WD_ALIGN_PARAGRAPH.RIGHT: TA_RIGHT,
        WD_ALIGN_PARAGRAPH.JUSTIFY: TA_JUSTIFY,
    }

    def _rl_style(para) -> ParagraphStyle:
        name = (para.style.name or "Normal").lower()
        base = styles["Normal"]
        align = _ALIGN_MAP.get(para.alignment, TA_LEFT)

        if "heading 1" in name:
            return ParagraphStyle(
                "H1", parent=base, fontSize=18, leading=22, spaceAfter=8,
                spaceBefore=14, fontName="Helvetica-Bold", alignment=align
            )
        if "heading 2" in name:
            return ParagraphStyle(
                "H2", parent=base, fontSize=15, leading=19, spaceAfter=6,
                spaceBefore=10, fontName="Helvetica-Bold", alignment=align
            )
        if "heading 3" in name:
            return ParagraphStyle(
                "H3", parent=base, fontSize=13, leading=17, spaceAfter=4,
                spaceBefore=8, fontName="Helvetica-Bold", alignment=align
            )
        if any(h in name for h in ("heading 4", "heading 5", "heading 6")):
            return ParagraphStyle(
                "H456", parent=base, fontSize=11, leading=15, spaceAfter=3,
                spaceBefore=6, fontName="Helvetica-Bold", alignment=align
            )
        if "list" in name:
            return ParagraphStyle(
                "List", parent=base, fontSize=10, leading=14, leftIndent=18,
                bulletIndent=6, alignment=align
            )
        return ParagraphStyle(
            "Norm", parent=base, fontSize=10, leading=14, spaceAfter=4, alignment=align
        )

    def _run_markup(run) -> str:
        text = run.text or ""
        if not text:
            return ""
        text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        bold = run.bold or False
        italic = run.italic or False
        # Font size (half-points → points)
        fs = run.font.size
        size = int(fs / 12700) if fs else None  # EMU → pt: 1pt = 12700 EMU

        # Font color
        clr = run.font.color
        hex_color = None
        if clr and clr.type is not None:
            try:
                rgb = clr.rgb
                if rgb:
                    hex_color = f"#{rgb}"
            except Exception:
                pass

        # Build tags inside-out
        if hex_color:
            text = f'<font color="{hex_color}">{text}</font>'
        if size:
            text = f'<font size="{size}">{text}</font>'
        if bold and italic:
            text = f"<b><i>{text}</i></b>"
        elif bold:
            text = f"<b>{text}</b>"
        elif italic:
            text = f"<i>{text}</i>"
        return text

    def _para_text(para) -> str:
        return "".join(_run_markup(r) for r in para.runs)

    def _bullet_prefix(para) -> str:
        name = (para.style.name or "").lower()
        if "bullet" in name:
            return "• "
        if "number" in name or "list paragraph" in name:
            return ""  # let Paragraph handle indentation
        return ""

    # ── emit images from the DOCX inline shapes ──
    def _try_emit_images(para):
        from lxml import etree  # python-docx relies on lxml
        drawings = para._p.findall(
            ".//{http://schemas.openxmlformats.org/drawingml/2006/main}blip"
        )
        results = []
        for blip in drawings:
            rId = blip.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
            if not rId:
                continue
            try:
                part = para.part.related_parts[rId]
                img_data = part.blob
                img_rl = Image(io.BytesIO(img_data), width=4 * inch, height=3 * inch,
                               kind="proportional")
                results.append(img_rl)
            except Exception:
                pass
        return results

    # ── main loop: paragraphs ──
    for element in doc.element.body:
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        if tag == "p":
            from docx.text.paragraph import Paragraph as DocxParagraph
            para = DocxParagraph(element, doc)

            # Check for inline images first
            imgs = _try_emit_images(para)
            for img in imgs:
                story.append(img)
                story.append(Spacer(1, 6))

            markup = _para_text(para)
            if not markup.strip() and not para.text.strip():
                story.append(Spacer(1, 6))
                continue

            prefix = _bullet_prefix(para)
            rl_style = _rl_style(para)
            try:
                story.append(Paragraph(prefix + markup, rl_style))
            except Exception:
                # Fallback: strip markup on parse error
                plain = para.text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(prefix + plain, rl_style))

        elif tag == "tbl":
            from docx.table import Table as DocxTable
            tbl = DocxTable(element, doc)
            data = []
            for row in tbl.rows:
                row_data = []
                for cell in row.cells:
                    cell_text = "\n".join(p.text for p in cell.paragraphs)
                    row_data.append(Paragraph(
                        cell_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
                        ParagraphStyle("Cell", parent=styles["Normal"], fontSize=9, leading=12)
                    ))
                data.append(row_data)

            if data:
                col_count = max(len(r) for r in data)
                col_width = (letter[0] - 1.5 * inch) / max(col_count, 1)
                rl_table = Table(data, colWidths=[col_width] * col_count, repeatRows=1)
                rl_table.setStyle(TableStyle([
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]))
                story.append(rl_table)
                story.append(Spacer(1, 8))

    buf = io.BytesIO()
    pdf_doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )
    pdf_doc.build(story)
    log.info("word_to_pdf_reportlab", size=buf.tell())
    return buf.getvalue()
