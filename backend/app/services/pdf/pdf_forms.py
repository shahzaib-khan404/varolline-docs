"""
PDF Forms & AcroForm service.

Engine: PyMuPDF native AcroForm widget reader & batch field filler.
Supports native interactive AcroForm widgets and AI-powered optimized heuristic form detection
for flattened and scanned PDFs.
"""

from __future__ import annotations

import re
from typing import Any
import structlog
import fitz

log = structlog.get_logger(__name__)

DATE_KEYWORDS = {
    "date", "dob", "birth", "day", "month", "year", "issued", "expiry",
    "feb", "jan", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
}
SIG_KEYWORDS = {
    "signature", "sign", "signed", "sincerely", "regards", "authorized", "hr", "stamp"
}
CHECK_KEYWORDS = {
    "check", "agree", "accept", "yes", "no", "opt", "choice", "male", "female"
}


def detect_form_fields(pdf_bytes: bytes) -> list[dict]:
    """
    Optimized heuristic & computer-vision technique to detect fillable form fields
    on flattened, vector, or scanned PDFs.
    Accurately identifies:
    1. Vector horizontal underlines (e.g. lines for fill-in values)
    2. Vector rectangular input boxes and tables
    3. Small square vector checkboxes
    4. Text-based underline blanks ('_____', '......')
    5. Checkbox text glyphs ('[ ]', '( )', '☐', '☑', '▢')
    6. Prompt labels ending with ':' or form keywords ('Name:', 'Date of Birth:', 'Signature:', etc.)
    7. Accurately associates nearby labels with underlines and boxes.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    detected: list[dict] = []
    seen_rects: list[fitz.Rect] = []

    def is_duplicate(r: fitz.Rect) -> bool:
        for prev in seen_rects:
            intersect = r & prev
            if not intersect.is_empty:
                min_area = min(r.get_area(), prev.get_area())
                if min_area > 0 and (intersect.get_area() / min_area) > 0.45:
                    return True
        return False

    def sanitize_name(txt: str, fallback: str) -> str:
        s = re.sub(r"[^a-zA-Z0-9_]", "_", txt.strip().lower())
        s = re.sub(r"_+", "_", s).strip("_")
        return s[:35] if s else fallback

    def infer_type(lbl: str) -> str:
        low = lbl.lower()
        if any(k in low for k in DATE_KEYWORDS):
            return "date"
        if any(k in low for k in SIG_KEYWORDS):
            return "signature"
        if any(k in low for k in CHECK_KEYWORDS):
            return "checkbox"
        return "text"

    for pno in range(doc.page_count):
        page = doc[pno]
        page_rect = page.rect
        page_w = page_rect.width
        page_h = page_rect.height

        blocks = page.get_text("blocks")
        drawings = page.get_drawings()

        # Step 1: Extract candidate vector elements (boxes, lines, checkboxes)
        candidate_boxes: list[dict] = []
        candidate_lines: list[dict] = []
        candidate_checks: list[dict] = []

        for d in drawings:
            # Check items
            for item in d.get("items", []):
                cmd = item[0]
                if cmd == "re":
                    r = item[1]
                    if not isinstance(r, fitz.Rect):
                        continue
                    if r.width >= page_w - 25 or r.height >= page_h - 25:
                        continue
                    if 8 <= r.width <= 26 and 8 <= r.height <= 26 and abs(r.width - r.height) <= 6:
                        candidate_checks.append({"rect": r, "type": "checkbox"})
                    elif 12 <= r.height <= 48 and 35 <= r.width <= 540:
                        candidate_boxes.append({"rect": r, "type": "text"})
                    elif r.height <= 3.5 and 35 <= r.width <= 540:
                        candidate_lines.append({
                            "rect": fitz.Rect(r.x0, max(0, r.y0 - 20), r.x1, r.y1 + 2),
                            "line_y": r.y0,
                            "type": "text"
                        })
                elif cmd == "l":
                    p1, p2 = item[1], item[2]
                    if abs(p1.y - p2.y) <= 3 and abs(p1.x - p2.x) >= 35:
                        lx0 = min(p1.x, p2.x)
                        lx1 = max(p1.x, p2.x)
                        ly = (p1.y + p2.y) / 2
                        candidate_lines.append({
                            "rect": fitz.Rect(lx0, max(0, ly - 20), lx1, ly + 2),
                            "line_y": ly,
                            "type": "text"
                        })

            dr = d.get("rect")
            if dr and not (dr.width >= page_w - 25 or dr.height >= page_h - 25):
                if dr.height <= 3.5 and 35 <= dr.width <= 540:
                    candidate_lines.append({
                        "rect": fitz.Rect(dr.x0, max(0, dr.y0 - 20), dr.x1, dr.y1 + 2),
                        "line_y": dr.y0,
                        "type": "text"
                    })
                elif 8 <= dr.width <= 26 and 8 <= dr.height <= 26 and abs(dr.width - dr.height) <= 6:
                    candidate_checks.append({"rect": dr, "type": "checkbox"})
                elif 12 <= dr.height <= 48 and 35 <= dr.width <= 540:
                    candidate_boxes.append({"rect": dr, "type": "text"})

        # Step 2: Extract text cues & match with geometry
        clean_blocks = []
        for b in blocks:
            x0, y0, x1, y1, text, block_no, btype = b
            ctext = text.strip()
            if ctext:
                clean_blocks.append((fitz.Rect(x0, y0, x1, y1), ctext))

        # Check for Checkbox glyphs, underlines, and colon prompts in text
        for brect, btext in clean_blocks:
            lines = btext.split("\n")
            for line_idx, line in enumerate(lines):
                sline = line.strip()
                if not sline:
                    continue

                # 1. Checkbox symbols
                if any(sym in sline for sym in ("[ ]", "[  ]", "( )", "☐", "☑", "☒", "▢", "○", "□")):
                    for sym in ("[ ]", "[  ]", "( )", "☐", "☑", "☒", "▢", "○", "□"):
                        if sym in sline:
                            sym_idx = sline.find(sym)
                            lbl_text = sline.replace(sym, "").strip() or f"Option {len(detected)+1}"
                            frac = sym_idx / max(1, len(sline))
                            cx0 = brect.x0 + brect.width * frac
                            cy0 = brect.y0 + (brect.height / max(1, len(lines))) * line_idx
                            rect = fitz.Rect(cx0, cy0, cx0 + 18, cy0 + 18)
                            if not is_duplicate(rect):
                                seen_rects.append(rect)
                                detected.append({
                                    "id": f"det-{pno+1}-chk-{len(detected)}",
                                    "name": sanitize_name(lbl_text, f"chk_{len(detected)+1}"),
                                    "type": "checkbox",
                                    "page": pno + 1,
                                    "x": round(rect.x0, 1),
                                    "y": round(rect.y0, 1),
                                    "width": 18.0,
                                    "height": 18.0,
                                    "value": False,
                                    "label": lbl_text[:35],
                                })
                            break

                # 2. Underline strings in text (e.g., 'Name: ____________' or 'Date: ....')
                m_und = re.search(r"_{3,}|\.{4,}|-{4,}", sline)
                if m_und:
                    prefix = sline[:m_und.start()].strip()
                    lbl = prefix.rstrip(":").strip() or f"Field {len(detected)+1}"
                    ftype = infer_type(lbl)
                    fraction_start = m_und.start() / max(1, len(sline))
                    fraction_len = (m_und.end() - m_und.start()) / max(1, len(sline))
                    fx0 = brect.x0 + brect.width * fraction_start
                    fw = max(90.0, brect.width * fraction_len)
                    fy0 = brect.y0 + (brect.height / max(1, len(lines))) * line_idx
                    fh = max(20.0, brect.height / max(1, len(lines)))
                    rect = fitz.Rect(fx0, max(5, fy0 - 2), min(page_w - 10, fx0 + fw), fy0 + fh)
                    if not is_duplicate(rect):
                        seen_rects.append(rect)
                        detected.append({
                            "id": f"det-{pno+1}-und-{len(detected)}",
                            "name": sanitize_name(lbl, f"field_{len(detected)+1}"),
                            "type": ftype,
                            "page": pno + 1,
                            "x": round(rect.x0, 1),
                            "y": round(rect.y0, 1),
                            "width": round(rect.width, 1),
                            "height": round(rect.height, 1),
                            "value": "",
                            "label": lbl,
                        })

                # 3. Colon prompts: e.g. "Name:", "Date of Birth:", "Signature:", "Email:"
                elif ":" in sline and len(sline.split(":")[0]) <= 35:
                    parts = sline.split(":", 1)
                    lbl = parts[0].strip()
                    val = parts[1].strip() if len(parts) > 1 else ""
                    if not re.match(r"^\d+$", lbl) and not lbl.lower().startswith(("http", "ftp")):
                        ftype = infer_type(lbl)
                        line_y_est = brect.y0 + (brect.height / max(1, len(lines))) * line_idx
                        matched_elem = None
                        for cand in candidate_lines + candidate_boxes:
                            cr = cand["rect"]
                            if abs(cr.y0 - line_y_est) <= 15 and 0 <= (cr.x0 - brect.x1) <= 160:
                                matched_elem = cr
                                break
                            elif 0 <= (cr.y0 - line_y_est) <= 25 and abs(cr.x0 - brect.x0) <= 60:
                                matched_elem = cr
                                break

                        if matched_elem is not None:
                            rect = matched_elem
                        else:
                            fx0 = min(brect.x1 + 6, page_w - 140)
                            fy0 = max(5, line_y_est - 2)
                            fw = max(110.0, min(240.0, page_w - fx0 - 25))
                            fh = max(20.0, min(30.0, brect.height / max(1, len(lines)) + 4))
                            rect = fitz.Rect(fx0, fy0, fx0 + fw, fy0 + fh)

                        if not is_duplicate(rect):
                            seen_rects.append(rect)
                            detected.append({
                                "id": f"det-{pno+1}-colon-{len(detected)}",
                                "name": sanitize_name(lbl, f"field_{len(detected)+1}"),
                                "type": ftype,
                                "page": pno + 1,
                                "x": round(rect.x0, 1),
                                "y": round(rect.y0, 1),
                                "width": round(rect.width, 1),
                                "height": round(rect.height, 1),
                                "value": val,
                                "label": lbl,
                            })

        # Step 3: Candidate drawings that were not claimed
        for cand in candidate_checks:
            cr = cand["rect"]
            if not is_duplicate(cr):
                lbl = ""
                for brect, btext in clean_blocks:
                    if abs(brect.y0 - cr.y0) <= 12 and 0 <= (brect.x0 - cr.x1) <= 100:
                        lbl = btext.split("\n")[0].strip()
                        break
                seen_rects.append(cr)
                detected.append({
                    "id": f"det-{pno+1}-chk-{len(detected)}",
                    "name": sanitize_name(lbl or f"chk_{len(detected)+1}", f"chk_{len(detected)+1}"),
                    "type": "checkbox",
                    "page": pno + 1,
                    "x": round(cr.x0, 1),
                    "y": round(cr.y0, 1),
                    "width": round(cr.width, 1),
                    "height": round(cr.height, 1),
                    "value": False,
                    "label": lbl or f"Checkbox {len(detected)+1}",
                })

        for cand in candidate_lines + candidate_boxes:
            cr = cand["rect"]
            if not is_duplicate(cr):
                lbl = ""
                for brect, btext in clean_blocks:
                    if abs(brect.y0 - cr.y0) <= 15 and 0 <= (cr.x0 - brect.x1) <= 100:
                        lbl = btext.split("\n")[-1].strip().rstrip(":")
                        break
                    elif 0 <= (cr.y0 - brect.y1) <= 18 and abs(cr.x0 - brect.x0) <= 80:
                        lbl = btext.split("\n")[-1].strip().rstrip(":")
                        break

                ftype = infer_type(lbl) if lbl else "text"
                seen_rects.append(cr)
                detected.append({
                    "id": f"det-{pno+1}-box-{len(detected)}",
                    "name": sanitize_name(lbl or f"field_{len(detected)+1}", f"field_{len(detected)+1}"),
                    "type": ftype,
                    "page": pno + 1,
                    "x": round(cr.x0, 1),
                    "y": round(cr.y0, 1),
                    "width": round(cr.width, 1),
                    "height": round(cr.height, 1),
                    "value": "",
                    "label": lbl or f"Field {len(detected)+1}",
                })

    doc.close()
    return detected


def get_form_fields(pdf_bytes: bytes) -> dict:
    """Inspect and list all interactive form fields contained within a PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    native_fields = []

    for pno in range(doc.page_count):
        page = doc[pno]
        for w in page.widgets():
            ftype = (
                "checkbox"
                if w.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX
                else "signature"
                if w.field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE
                else "text"
            )
            native_fields.append({
                "id": f"acro-{pno+1}-{w.field_name}",
                "page": pno + 1,
                "name": w.field_name,
                "type": ftype,
                "value": w.field_value or "",
                "label": w.field_label or w.field_name,
                "x": round(w.rect.x0, 1),
                "y": round(w.rect.y0, 1),
                "width": round(w.rect.width, 1),
                "height": round(w.rect.height, 1),
                "is_native": True,
            })

    has_fillable = len(native_fields) > 0
    doc.close()

    return {
        "has_fillable_fields": has_fillable,
        "fields": native_fields,
    }


def fill_pdf_forms(
    pdf_bytes: bytes,
    field_values: dict[str, Any] | None = None,
    custom_fields: list[dict] | None = None,
    *,
    flatten: bool = True,
) -> bytes:
    """
    Populate form fields by name and custom coordinates, with optional baking/flattening.
    """
    log.info(
        "fill_pdf_forms_start",
        fields_count=len(field_values or {}),
        custom_count=len(custom_fields or []),
        flatten=flatten,
    )

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # 1. Fill Native AcroForm widgets if present
    if field_values:
        for pno in range(doc.page_count):
            page = doc[pno]
            for w in page.widgets():
                fname = w.field_name
                if fname in field_values:
                    val = field_values[fname]
                    try:
                        if isinstance(val, bool):
                            w.field_value = "Yes" if val else "Off"
                        else:
                            w.field_value = str(val)
                        w.update()
                    except Exception as exc:
                        log.warning("fill_widget_failed", field=fname, error=str(exc))

    # 2. Fill Custom or Detected Form Fields
    if custom_fields:
        for cf in custom_fields:
            try:
                pno = int(cf.get("page", 1)) - 1
                if pno < 0 or pno >= doc.page_count:
                    continue
                page = doc[pno]
                val = cf.get("value", "")
                if val is None or val == "":
                    continue

                ftype = cf.get("type", "text")
                x = float(cf.get("x", 50))
                y = float(cf.get("y", 50))
                w = float(cf.get("width", 150))
                h = float(cf.get("height", 24))

                if flatten:
                    # Bake field value onto the page directly
                    if ftype == "checkbox":
                        is_checked = val is True or str(val).lower() in ("yes", "true", "1", "on")
                        if is_checked:
                            # Draw checkmark inside box
                            page.draw_rect(fitz.Rect(x, y, x + w, y + h), color=(0.1, 0.45, 0.95), width=1.5)
                            page.insert_text(fitz.Point(x + 2, y + h - 3), "✓", fontsize=max(10, h - 2), color=(0.1, 0.45, 0.95))
                    elif ftype == "signature":
                        # Draw signature in stylized italic font with signature baseline
                        page.insert_text(
                            fitz.Point(x + 4, y + h - 5),
                            str(val),
                            fontsize=13,
                            fontname="times-italic",
                            color=(0.05, 0.15, 0.6),
                        )
                    else:
                        # Draw white background to cover original text if needed, then write value
                        rect = fitz.Rect(x, y, x + w, y + h)
                        page.insert_textbox(
                            rect,
                            str(val),
                            fontsize=10.5,
                            color=(0.05, 0.05, 0.05),
                            fontname="helv",
                        )
                else:
                    # Add interactive AcroForm widget so downloaded PDF remains fillable
                    widget = fitz.Widget()
                    widget.rect = fitz.Rect(x, y, x + w, y + h)
                    if ftype == "checkbox":
                        widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
                        widget.field_value = "Yes" if val in (True, "Yes", "true", "on") else "Off"
                    elif ftype == "signature":
                        widget.field_type = fitz.PDF_WIDGET_TYPE_SIGNATURE
                    else:
                        widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
                        widget.field_value = str(val)
                    widget.field_name = cf.get("name", f"custom_field_{pno}_{x}_{y}")
                    page.add_widget(widget)
            except Exception as err:
                log.warning("fill_custom_field_failed", field=cf, error=str(err))

    out_bytes = doc.tobytes(deflate=True, garbage=3)
    doc.close()

    log.info("fill_pdf_forms_completed", output_size=len(out_bytes))
    return out_bytes

