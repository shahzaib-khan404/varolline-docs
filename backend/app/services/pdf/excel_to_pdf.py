"""
Excel (.xlsx, .xls, .csv) → PDF conversion.

Primary strategy: Headless LibreOffice converter.
Fallback:         openpyxl + ReportLab Table Platypus with styled data grid.
"""

from __future__ import annotations

import csv
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


def _windows_com_convert(excel_bytes: bytes, ext: str = "xlsx") -> bytes:
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    try:
        progids = ["excel.application", "ket.application"]
        for progid in progids:
            try:
                app = win32com.client.Dispatch(progid)
            except Exception:
                continue

            try:
                try:
                    app.DisplayAlerts = False
                except Exception:
                    pass
                with tempfile.TemporaryDirectory() as tmp:
                    src = os.path.abspath(os.path.join(tmp, f"input.{ext}"))
                    out = os.path.abspath(os.path.join(tmp, "output.pdf"))
                    with open(src, "wb") as f:
                        f.write(excel_bytes)
                    wb = app.Workbooks.Open(src, ReadOnly=True)
                    # Configure page setup on each sheet for clean, landscape, readable layout
                    try:
                        for sheet in wb.Worksheets:
                            try:
                                # xlLandscape = 2
                                sheet.PageSetup.Orientation = 2
                                sheet.PageSetup.Zoom = False
                                sheet.PageSetup.FitToPagesWide = 1
                                sheet.PageSetup.FitToPagesTall = False
                                sheet.PageSetup.PrintGridlines = True
                            except Exception:
                                pass
                    except Exception:
                        pass

                    # 0 = xlTypePDF
                    wb.ExportAsFixedFormat(0, out)
                    wb.Close(SaveChanges=False)
                    with open(out, "rb") as f:
                        data = f.read()
                    log.info("excel_to_pdf_com_success", progid=progid, size=len(data))
                    return data
            except Exception as exc:
                log.warning("excel_com_convert_failed", progid=progid, error=str(exc))
            finally:
                try:
                    app.Quit()
                except Exception:
                    pass
    finally:
        pythoncom.CoUninitialize()

    raise RuntimeError("Native Windows COM Excel conversion failed for all providers.")


def excel_to_pdf(excel_bytes: bytes, ext: str = "xlsx") -> bytes:
    """Convert Excel / CSV workbook bytes to PDF bytes."""
    # 1. On Windows, use native Excel / WPS COM automation
    if os.name == "nt" and ext != "csv":
        try:
            return _windows_com_convert(excel_bytes, ext=ext)
        except Exception as exc:
            log.warning("excel_windows_com_failed_trying_libreoffice", error=str(exc))

    # 2. Try Headless LibreOffice
    lo = _find_libreoffice()
    if lo:
        try:
            return _libreoffice_convert(excel_bytes, lo, ext=ext)
        except Exception as exc:
            log.warning("excel_libreoffice_failed_fallback", error=str(exc))

    return _openpyxl_fallback_convert(excel_bytes, ext=ext)


def _libreoffice_convert(excel_bytes: bytes, lo_bin: str, ext: str = "xlsx") -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, f"input.{ext}")
        with open(src, "wb") as f:
            f.write(excel_bytes)

        subprocess.run(
            [lo_bin, "--headless", "--convert-to", "pdf", "--outdir", tmp, src],
            check=True,
            capture_output=True,
            timeout=120,
        )

        out = os.path.join(tmp, "input.pdf")
        with open(out, "rb") as f:
            data = f.read()
        log.info("excel_to_pdf_libreoffice_success", size=len(data))
        return data


def _openpyxl_fallback_convert(excel_bytes: bytes, ext: str = "xlsx") -> bytes:
    """Fallback using openpyxl / csv and ReportLab Table."""
    import openpyxl
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    rows_data: list[list[str]] = []

    if ext == "csv":
        text_stream = io.StringIO(excel_bytes.decode("utf-8", errors="replace"))
        reader = csv.reader(text_stream)
        for row in reader:
            rows_data.append([str(c)[:40] for c in row])
    else:
        wb = openpyxl.load_workbook(io.BytesIO(excel_bytes), data_only=True)
        sheet = wb.active
        if sheet:
            for row in sheet.iter_rows(values_only=True):
                # Stop if entire row is empty
                if not any(row):
                    continue
                rows_data.append([str(c or "")[:40] for c in row])

    if not rows_data:
        rows_data = [["No data found in spreadsheet"]]

    # Cap to max 50 columns and 500 rows for rendering sanity
    rows_data = [r[:15] for r in rows_data[:300]]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(letter),
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24,
    )

    styles = getSampleStyleSheet()
    cell_style = ParagraphStyle(
        "Cell",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E293B"),
    )
    header_style = ParagraphStyle(
        "HeaderCell",
        parent=cell_style,
        fontSize=8,
        leading=10,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#FFFFFF"),
    )

    table_cells = []
    for r_idx, row in enumerate(rows_data):
        row_cells = []
        is_header = r_idx == 0
        for cell_val in row:
            st = header_style if is_header else cell_style
            row_cells.append(Paragraph(str(cell_val), st))
        table_cells.append(row_cells)

    t = Table(table_cells, repeatRows=1)
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0284C7")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )

    doc.build([t])
    buf.seek(0)
    data = buf.read()
    log.info("excel_to_pdf_fallback_success", size=len(data))
    return data
