"""
PDF → Excel (.xlsx) extraction service.

Engine: Multi-strategy table extraction (PyMuPDF vector lines + text layout + spatial word clustering) + openpyxl.
Extracts complete tabular data across all pages with styling, column width auto-fitting, and multi-page stitching.
"""

from __future__ import annotations

import io
import structlog
import fitz
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

log = structlog.get_logger(__name__)


def _extract_page_rows(page: fitz.Page) -> list[list[str]]:
    """Extract table rows from a PDF page using multi-strategy fallback."""
    # 1. Vector line tables
    try:
        tabs = page.find_tables()
        for t in tabs.tables:
            data = t.extract()
            cleaned = [[str(c).strip() if c is not None else "" for c in row] for row in data]
            cleaned = [r for r in cleaned if any(r)]
            if len(cleaned) > 1 and len(cleaned[0]) > 1:
                return cleaned
    except Exception:
        pass

    # 2. Text layout boundaries
    try:
        tabs_text = page.find_tables(vertical_strategy="text", horizontal_strategy="text")
        for t in tabs_text.tables:
            data = t.extract()
            cleaned = [[str(c).strip() if c is not None else "" for c in row] for row in data]
            cleaned = [r for r in cleaned if any(r)]
            if len(cleaned) > 1 and len(cleaned[0]) > 1:
                return cleaned
    except Exception:
        pass

    # 3. Spatial word coordinate clustering
    try:
        words = page.get_text("words")
        if words:
            lines: dict[float, list] = {}
            for w in words:
                y = round(w[1] / 7.0) * 7.0
                lines.setdefault(y, []).append(w)

            table: list[list[str]] = []
            for y in sorted(lines.keys()):
                lw = sorted(lines[y], key=lambda x: x[0])
                cells: list[str] = []
                cur_cell = [lw[0][4]]
                last_x1 = lw[0][2]
                for w in lw[1:]:
                    if w[0] - last_x1 < 18:
                        cur_cell.append(w[4])
                    else:
                        cells.append(" ".join(cur_cell))
                        cur_cell = [w[4]]
                    last_x1 = w[2]
                cells.append(" ".join(cur_cell))
                if any(cells):
                    table.append(cells)
            if len(table) > 1:
                return table
    except Exception:
        pass

    # 4. Fallback text blocks
    blocks = page.get_text("blocks")
    if blocks:
        return [[b[4].strip()] for b in blocks if b[4].strip()]
    return []


def pdf_to_excel(pdf_bytes: bytes) -> bytes:
    """Extract tables from PDF bytes and return Excel (.xlsx) bytes."""
    log.info("pdf_to_excel_start", size=len(pdf_bytes))

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Remove default blank sheet

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
    alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    total_rows_extracted = 0
    current_sheet = None
    current_headers = None
    current_col_count = 0
    sheet_index = 1

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for pno in range(doc.page_count):
            page_rows = _extract_page_rows(doc[pno])
            if not page_rows:
                continue

            page_header = page_rows[0]
            col_count = len(page_header)

            # Determine whether this page continues the previous table or starts a new sheet
            is_continuation = False
            if current_sheet is not None:
                # If column count matches or headers match, append to current sheet
                if col_count == current_col_count or (
                    current_headers and [h.lower() for h in page_header] == [h.lower() for h in current_headers]
                ):
                    is_continuation = True

            if not is_continuation or current_sheet is None:
                sheet_title = f"Sheet {sheet_index}" if sheet_index > 1 else "Extracted Data"
                current_sheet = wb.create_sheet(title=sheet_title)
                sheet_index += 1
                current_headers = page_header
                current_col_count = col_count
                start_row_in_data = 0
            else:
                # If the first row of continuation repeats the header, skip it
                if [h.lower() for h in page_header] == [h.lower() for h in (current_headers or [])]:
                    start_row_in_data = 1
                else:
                    start_row_in_data = 0

            # Write rows
            for row_idx, row_vals in enumerate(page_rows[start_row_in_data:], start=current_sheet.max_row + 1 if is_continuation else 1):
                # Ensure each row has at least current_col_count columns
                padded = row_vals + [""] * max(0, current_col_count - len(row_vals))
                for c_idx, val in enumerate(padded[:max(current_col_count, len(padded))], start=1):
                    cell = current_sheet.cell(row=row_idx, column=c_idx, value=val)
                    cell.border = thin_border
                    if row_idx == 1:
                        cell.font = header_font
                        cell.fill = header_fill
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                    else:
                        if row_idx % 2 == 0:
                            cell.fill = alt_fill
                        cell.alignment = Alignment(horizontal="left", vertical="center")

                total_rows_extracted += 1

    # Format column dimensions across all created sheets
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col) if col else 10
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(45, max(max_len + 3, 12))

    # Fallback if no sheets were created
    if not wb.sheetnames:
        ws = wb.create_sheet(title="Extracted Data")
        ws.cell(row=1, column=1, value="No tabular data could be detected in this document.")

    out_buf = io.BytesIO()
    wb.save(out_buf)
    out_buf.seek(0)
    data = out_buf.read()

    log.info("pdf_to_excel_done", rows=total_rows_extracted, output_size=len(data))
    return data
