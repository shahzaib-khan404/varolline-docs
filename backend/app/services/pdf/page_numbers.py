"""
PDF page numbering service — adds customizable headers/footers with dynamic numbers.
Supports 3x3 matrix positioning, facing pages (book mode), margin presets, and page range filtering.
"""

from __future__ import annotations

import structlog
import fitz

log = structlog.get_logger(__name__)

MARGIN_PRESETS = {
    "small": 18.0,
    "recommended": 36.0,
    "large": 54.0,
}


def add_page_numbers(
    pdf_bytes: bytes,
    *,
    position: str = "bottom-center",
    page_mode: str = "single",  # "single" | "facing"
    format_template: str = "{n}",
    start_page: int = 1,
    end_page: int | None = None,
    first_number: int = 1,
    margin: str | float = "recommended",
    font_size: float = 10.0,
    font_name: str = "helv",
    bold: bool = False,
    italic: bool = False,
    color: tuple[float, float, float] = (0.2, 0.2, 0.2),
) -> bytes:
    """
    Insert dynamic page numbers onto PDF pages.
    """
    font_size = max(6.0, min(72.0, float(font_size)))
    start_page = max(1, int(start_page))

    # Resolve margin in points
    if isinstance(margin, str) and margin.lower() in MARGIN_PRESETS:
        margin_pt = MARGIN_PRESETS[margin.lower()]
    else:
        try:
            margin_pt = float(margin)
        except Exception:
            margin_pt = 36.0

    margin_x = margin_pt
    margin_y = margin_pt

    # Resolve font with bold/italic variants (PyMuPDF standard 14 font identifiers)
    base_font = font_name.lower()
    if "times" in base_font:
        if bold and italic:
            resolved_font = "times-bolditalic"
        elif bold:
            resolved_font = "times-bold"
        elif italic:
            resolved_font = "times-italic"
        else:
            resolved_font = "times-roman"
    elif "courier" in base_font:
        if bold and italic:
            resolved_font = "cobi"
        elif bold:
            resolved_font = "cobo"
        elif italic:
            resolved_font = "coit"
        else:
            resolved_font = "cour"
    else:
        # Default Helvetica / Arial
        if bold and italic:
            resolved_font = "hebi"
        elif bold:
            resolved_font = "hebo"
        elif italic:
            resolved_font = "heit"
        else:
            resolved_font = "helv"

    log.info(
        "add_page_numbers_start",
        position=position,
        page_mode=page_mode,
        start_page=start_page,
        end_page=end_page,
        font_size=font_size,
    )

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        total_pages = doc.page_count
        if total_pages == 0:
            raise ValueError("Input PDF contains no pages.")

        actual_end_page = min(total_pages, int(end_page)) if end_page is not None else total_pages
        numbered_pages_count = max(1, actual_end_page - start_page + 1)

        current_num = first_number
        for idx in range(total_pages):
            page_num_1based = idx + 1
            if page_num_1based < start_page or page_num_1based > actual_end_page:
                continue

            page = doc[idx]
            rect = page.rect
            width = rect.width
            height = rect.height

            # Format the text
            text = (
                format_template
                .replace("{n}", str(current_num))
                .replace("{total}", str(numbered_pages_count))
            )

            text_width = fitz.get_text_length(text, fontname=resolved_font, fontsize=font_size)

            # Facing pages mode calculation:
            # For even pages (page_num_1based % 2 == 0), mirror left and right
            target_pos = position.lower()
            if page_mode.lower() == "facing" and page_num_1based % 2 == 0:
                if "left" in target_pos:
                    target_pos = target_pos.replace("left", "right")
                elif "right" in target_pos:
                    target_pos = target_pos.replace("right", "left")

            # 3x3 Matrix Coordinates (Top, Middle, Bottom) x (Left, Center, Right)
            if "top" in target_pos:
                y = margin_y + font_size
            elif "middle" in target_pos or "center" == target_pos.split("-")[0]:
                y = (height / 2) + (font_size / 2)
            else:
                # bottom
                y = height - margin_y

            if "left" in target_pos:
                x = margin_x
            elif "right" in target_pos:
                x = width - margin_x - text_width
            else:
                # center
                x = (width - text_width) / 2

            point = fitz.Point(x, y)
            try:
                page.insert_text(
                    point,
                    text,
                    fontsize=font_size,
                    fontname=resolved_font,
                    color=color,
                    overlay=True,
                )
            except Exception:
                page.insert_text(
                    point,
                    text,
                    fontsize=font_size,
                    fontname="helv",
                    color=color,
                    overlay=True,
                )

            current_num += 1

        result = doc.tobytes(garbage=4, deflate=True)

    log.info("add_page_numbers_done", size=len(result))
    return result
