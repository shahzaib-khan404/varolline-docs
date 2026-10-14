"""
PDF Content Editing service.

Engine: PyMuPDF high-speed native vector and text overlay insertion.
Allows overlaying text blocks, callouts, colored rectangles, lines, and custom images.
"""

from __future__ import annotations

import base64
import io
import structlog
import fitz

log = structlog.get_logger(__name__)


def edit_pdf(pdf_bytes: bytes, elements: list[dict] | None = None) -> bytes:
    """
    Overlay elements onto PDF pages.
    elements: list of dicts with:
      - type: 'text' | 'rect' | 'image'
      - page: int (1-based index)
      - x: float
      - y: float
      - width: float (optional)
      - height: float (optional)
      - text: str (for type='text')
      - font_size: float (default 12)
      - color: list[float] (RGB 0.0-1.0, e.g. [0, 0, 0])
      - fill: list[float] (optional RGB for rect)
      - image_data: str (base64 image for type='image')
    """
    log.info("edit_pdf_start", initial_size=len(pdf_bytes), element_count=len(elements or []))

    if not elements:
        return pdf_bytes

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for elem in elements:
        try:
            page_idx = int(elem.get("page", 1)) - 1
            if page_idx < 0 or page_idx >= doc.page_count:
                continue

            page = doc[page_idx]
            elem_type = elem.get("type", "text")
            x = float(elem.get("x", 50))
            y = float(elem.get("y", 50))
            raw_color = elem.get("color", [0, 0, 0])
            color = tuple(float(c) for c in raw_color[:3]) if isinstance(raw_color, (list, tuple)) else (0, 0, 0)

            if elem_type == "text":
                text = str(elem.get("text", ""))
                font_size = float(elem.get("font_size", 12))
                font_family = str(elem.get("font_family", "helv")).lower()
                bold = bool(elem.get("bold", False))
                italic = bool(elem.get("italic", False))
                underline = bool(elem.get("underline", False))

                # Standard PyMuPDF font resolution
                if "times" in font_family:
                    resolved_font = (
                        "times-bolditalic"
                        if (bold and italic)
                        else "times-bold"
                        if bold
                        else "times-italic"
                        if italic
                        else "times-roman"
                    )
                elif "courier" in font_family:
                    resolved_font = (
                        "cobi"
                        if (bold and italic)
                        else "cobo"
                        if bold
                        else "coit"
                        if italic
                        else "cour"
                    )
                else:
                    resolved_font = (
                        "hebi"
                        if (bold and italic)
                        else "hebo"
                        if bold
                        else "heit"
                        if italic
                        else "helv"
                    )

                replace_rect = elem.get("replace_rect")
                if replace_rect and len(replace_rect) == 4:
                    try:
                        rx0, ry0, rx1, ry1 = [float(v) for v in replace_rect]
                        if rx1 < rx0:
                            rx1 = rx0 + rx1
                        if ry1 < ry0:
                            ry1 = ry0 + ry1
                        r_box = fitz.Rect(rx0, ry0, rx1, ry1)
                        page.add_redact_annot(r_box, fill=(1, 1, 1))
                        page.apply_redactions()
                    except Exception as red_err:
                        log.warning("edit_pdf_redact_error", error=str(red_err))

                try:
                    if replace_rect and len(replace_rect) == 4:
                        rx0, ry0, rx1, ry1 = [float(v) for v in replace_rect]
                        if rx1 < rx0:
                            rx1 = rx0 + rx1
                        if ry1 < ry0:
                            ry1 = ry0 + ry1
                        target_rect = fitz.Rect(rx0, ry0, max(rx1, rx0 + 200), max(ry1, ry0 + font_size * 2))
                        rem = page.insert_textbox(
                            target_rect,
                            text,
                            fontsize=font_size,
                            color=color,
                            fontname=resolved_font,
                        )
                        if rem < 0:
                            page.insert_text(
                                fitz.Point(rx0, ry0 + font_size * 0.85),
                                text,
                                fontsize=font_size,
                                color=color,
                                fontname=resolved_font,
                            )
                    else:
                        page.insert_text(
                            fitz.Point(x, y + font_size * 0.85),
                            text,
                            fontsize=font_size,
                            color=color,
                            fontname=resolved_font,
                        )
                except Exception:
                    page.insert_text(
                        fitz.Point(x, y + font_size * 0.85),
                        text,
                        fontsize=font_size,
                        color=color,
                        fontname="helv",
                    )

                if underline:
                    try:
                        text_w = fitz.get_text_length(text, fontname="helv", fontsize=font_size)
                        page.draw_line(
                            fitz.Point(x, y + 2),
                            fitz.Point(x + text_w, y + 2),
                            color=color,
                            width=1.0,
                        )
                    except Exception:
                        pass

            elif elem_type == "rect":
                w = float(elem.get("width", 100))
                h = float(elem.get("height", 50))
                rect = fitz.Rect(x, y, x + w, y + h)
                fill_raw = elem.get("fill")
                fill = tuple(float(c) for c in fill_raw[:3]) if fill_raw else None
                page.draw_rect(rect, color=color, fill=fill, width=1.5)

            elif elem_type == "image":
                raw_img = elem.get("image_data", "")
                if raw_img:
                    if "," in raw_img:
                        raw_img = raw_img.split(",", 1)[1]
                    img_bytes = base64.b64decode(raw_img)
                    w = float(elem.get("width", 120))
                    h = float(elem.get("height", 60))
                    rect = fitz.Rect(x, y, x + w, y + h)
                    page.insert_image(rect, stream=img_bytes)

        except Exception as err:
            log.warning("edit_pdf_element_error", element=elem, error=str(err))

    out_bytes = doc.tobytes(deflate=True, garbage=3)
    doc.close()

    log.info("edit_pdf_completed", output_size=len(out_bytes))
    return out_bytes
