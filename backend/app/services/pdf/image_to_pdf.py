"""Image → PDF conversion using PyMuPDF + Pillow for format handling."""

from __future__ import annotations

import io

import structlog
from PIL import Image

log = structlog.get_logger(__name__)

_SUPPORTED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/gif",
    "image/bmp", "image/tiff", "image/webp",
}


def images_to_pdf(image_bytes_list: list[bytes]) -> bytes:
    """
    Convert one or more images into a single PDF.

    Each image becomes one page.  Page size matches the image dimensions
    converted from its embedded DPI (defaulting to 72 dpi, which makes
    1 pixel = 1 PDF point and preserves the visual size at 100 % zoom).
    """
    import fitz

    if not image_bytes_list:
        raise ValueError("No images provided.")

    log.info("images_to_pdf_start", count=len(image_bytes_list))

    doc = fitz.open()

    for idx, data in enumerate(image_bytes_list):
        # Use Pillow to get accurate dimensions + DPI from EXIF
        with Image.open(io.BytesIO(data)) as img:
            img_rgb = img.convert("RGB")
            w_px, h_px = img_rgb.size

            dpi_info = img.info.get("dpi", (72.0, 72.0))
            dpi_x = float(dpi_info[0]) if dpi_info[0] else 72.0
            dpi_y = float(dpi_info[1]) if dpi_info[1] else 72.0

        # Convert pixel dimensions to PDF points (1 pt = 1/72 inch)
        w_pt = w_px * 72.0 / dpi_x
        h_pt = h_px * 72.0 / dpi_y

        page = doc.new_page(width=w_pt, height=h_pt)
        rect = fitz.Rect(0, 0, w_pt, h_pt)

        # Insert the raw bytes directly — fitz auto-detects PNG/JPEG/etc.
        page.insert_image(rect, stream=data, keep_proportion=False)

        log.debug(
            "images_to_pdf_page",
            page=idx + 1,
            w_px=w_px,
            h_px=h_px,
            dpi_x=dpi_x,
            dpi_y=dpi_y,
        )

    result = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    log.info("images_to_pdf_done", size=len(result))
    return result
