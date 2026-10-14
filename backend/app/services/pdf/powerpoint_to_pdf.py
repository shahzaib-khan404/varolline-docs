"""
PowerPoint (.pptx, .ppt) → PDF conversion.

Primary strategy: Headless LibreOffice converter.
Fallback:         python-pptx + ReportLab landscape slide deck synthesis.
"""

from __future__ import annotations

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


def _windows_com_convert(pptx_bytes: bytes, ext: str = "pptx") -> bytes:
    """
    High-fidelity native conversion via Windows COM automation.
    Tries Microsoft PowerPoint (powerpoint.application) and WPS Office (kwpp.application).
    Preserves 100% of shapes, fonts, vector graphics, slide masters, and color styles.
    """
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    try:
        # Check available office presentation suites
        progids = ["powerpoint.application", "kwpp.application"]
        for progid in progids:
            try:
                app = win32com.client.Dispatch(progid)
            except Exception as e:
                log.debug("powerpoint_com_not_installed", progid=progid, error=str(e))
                continue

            try:
                try:
                    # ppAlertsNone = 1
                    app.DisplayAlerts = 1
                except Exception:
                    pass

                with tempfile.TemporaryDirectory() as tmp:
                    src = os.path.abspath(os.path.join(tmp, f"input.{ext}"))
                    out = os.path.abspath(os.path.join(tmp, "output.pdf"))
                    with open(src, "wb") as f:
                        f.write(pptx_bytes)

                    # Presentations.Open(FileName, ReadOnly, Untitled, WithWindow)
                    # WithWindow=0 runs headless in the background
                    pres = None
                    try:
                        pres = app.Presentations.Open(src, 1, 0, 0)
                    except Exception:
                        pres = app.Presentations.Open(src)

                    # 32 = ppSaveAsPDF
                    pres.SaveAs(out, 32)
                    pres.Close()

                    with open(out, "rb") as f:
                        data = f.read()

                    log.info("powerpoint_to_pdf_com_success", progid=progid, size=len(data))
                    return data
            except Exception as exc:
                log.warning("powerpoint_com_convert_failed", progid=progid, error=str(exc))
            finally:
                try:
                    app.Quit()
                except Exception:
                    pass
    finally:
        pythoncom.CoUninitialize()

    raise RuntimeError("Native Windows COM PowerPoint conversion failed for all providers.")


def powerpoint_to_pdf(pptx_bytes: bytes, ext: str = "pptx") -> bytes:
    """Convert PowerPoint presentation bytes to PDF bytes."""
    # 1. On Windows, use native PowerPoint / WPS Presentation COM automation (perfect fidelity)
    if os.name == "nt":
        try:
            return _windows_com_convert(pptx_bytes, ext=ext)
        except Exception as exc:
            log.warning("pptx_windows_com_failed_trying_libreoffice", error=str(exc))

    # 2. Try Headless LibreOffice
    lo = _find_libreoffice()
    if lo:
        try:
            return _libreoffice_convert(pptx_bytes, lo, ext=ext)
        except Exception as exc:
            log.warning("pptx_libreoffice_failed_fallback", error=str(exc))

    # 3. Fallback deck generator
    return _pptx_fallback_convert(pptx_bytes)


def _libreoffice_convert(pptx_bytes: bytes, lo_bin: str, ext: str = "pptx") -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, f"input.{ext}")
        with open(src, "wb") as f:
            f.write(pptx_bytes)

        subprocess.run(
            [lo_bin, "--headless", "--convert-to", "pdf", "--outdir", tmp, src],
            check=True,
            capture_output=True,
            timeout=120,
        )

        out = os.path.join(tmp, "input.pdf")
        with open(out, "rb") as f:
            data = f.read()
        log.info("powerpoint_to_pdf_libreoffice_success", size=len(data))
        return data


def _pptx_fallback_convert(pptx_bytes: bytes) -> bytes:
    """Fallback using python-pptx and ReportLab canvas."""
    import io
    from pptx import Presentation
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, letter
    from reportlab.pdfgen import canvas

    prs = Presentation(io.BytesIO(pptx_bytes))
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(letter))
    page_w, page_h = landscape(letter)

    for slide in prs.slides:
        # Background card
        c.setFillColor(colors.HexColor("#FAFAFA"))
        c.rect(0, 0, page_w, page_h, fill=True, stroke=False)

        # Subtle border
        c.setStrokeColor(colors.HexColor("#E2E8F0"))
        c.setLineWidth(1)
        c.rect(20, 20, page_w - 40, page_h - 40, fill=False, stroke=True)

        y_offset = page_h - 60
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    text = para.text.strip()
                    if not text:
                        continue
                    # First non-empty paragraph gets title treatment
                    if y_offset == page_h - 60:
                        c.setFont("Helvetica-Bold", 18)
                        c.setFillColor(colors.HexColor("#0F172A"))
                    else:
                        c.setFont("Helvetica", 11)
                        c.setFillColor(colors.HexColor("#334155"))

                    c.drawString(45, max(40, y_offset), text[:120])
                    y_offset -= 22

        c.showPage()

    c.save()
    buf.seek(0)
    data = buf.read()
    log.info("powerpoint_to_pdf_fallback_success", size=len(data))
    return data
