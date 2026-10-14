"""
PDF True Cryptographic Redaction service.

Engine: PyMuPDF native page redaction annotator + byte-level stream purging.
Permanently scrubs text, vector paths, and raster image pixels so redacted
information cannot be selected, copied, inspected, or recovered.
"""

from __future__ import annotations

import re
from typing import Any
import structlog
import fitz

log = structlog.get_logger(__name__)

# Expanded PII and Entity Patterns matching iLovePDF Smart Redact
PII_PATTERNS: dict[str, list[re.Pattern]] = {
    # 1. Phones & Emails
    "email": [
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", re.IGNORECASE),
    ],
    "phone": [
        re.compile(r"(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,5}\b"),
        re.compile(r"\b0\d{2,4}[-.\s]?\d{6,8}\b"),
    ],
    "phones_and_emails": [
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", re.IGNORECASE),
        re.compile(r"(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,5}\b"),
        re.compile(r"\b0\d{2,4}[-.\s]?\d{6,8}\b"),
    ],

    # 2. SSN & National ID numbers (CNIC, Student/Employee IDs, Roll Nos)
    "ssn": [
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    ],
    "ssn_and_id_numbers": [
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        re.compile(r"\b\d{5}-\d{7}-\d\b"),  # CNIC
        re.compile(r"\b(?:SP|FA|F|S)\d{2}-[A-Za-z0-9]{2,5}-\d{3,5}\b", re.IGNORECASE),  # Academic Roll / Reg ID
        re.compile(r"\b(?:SSN|NIN|ID|CNIC|Roll\s*No|Reg\s*No|Student\s*ID|Emp\s*ID)[\s#:.]*([A-Za-z0-9-]+)\b", re.IGNORECASE),
        re.compile(r"\b[A-Z]{1,2}\d{7,9}\b"),  # Passports
    ],

    # 3. Credit Cards & Bank/Policy accounts
    "credit_card": [
        re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
    ],
    "account_and_policy_numbers": [
        re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
        re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b"),  # IBAN
        re.compile(r"\b(?:Account|Policy|Acct|IBAN|Invoice)[\s#:.]*([A-Za-z0-9-]{6,25})\b", re.IGNORECASE),
    ],

    # 4. Dates of Birth & Specific Dates
    "dates_of_birth": [
        re.compile(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[ \t]+\d{1,2}(?:st|nd|rd|th)?,?[ \t]+\d{4}\b", re.IGNORECASE),
        re.compile(r"\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19\d{2}|20\d{2})\b"),
        re.compile(r"\b(?:19\d{2}|20\d{2})[/-](?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])\b"),
        re.compile(r"\b(?:DOB|Birth|Born|Date\s*of\s*Birth)[\s#:.]*([A-Za-z0-9,/-]+)\b", re.IGNORECASE),
    ],

    # 5. Addresses & Zip codes
    "addresses": [
        re.compile(r"\b\d{1,5}[ \t]+[A-Za-z0-9.,#-]+(?:[ \t]+[A-Za-z0-9.,#-]+){0,4}[ \t]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Way|Suite|Ste\.?|Apt\.?|Building|Bldg\.?)\b"),
        re.compile(r"\b\d{5}(?:-\d{4})?\b"),
    ],

    # 6. Person names
    "person_names": [
        # Titles / honorifics: Mr., Mrs., Ms., Dr., Prof., Engr., Sir, Ma'am, HR,
        re.compile(r"(?:To\s*:|From\s*:|HR,\s*|Ma['’`a-z]*[ \t]+|supervision of[ \t]+)\s*([A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+){1,3})"),
        re.compile(r"\b(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Prof\.|Engr\.|Sir)[ \t]+([A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+){1,3})"),
        # Name followed by student/employee ID in parentheses: e.g. Muhammad Saeed(SP23-BCS-033)
        re.compile(r"\b([A-Z][a-z]+(?: [A-Z][a-zA-Z]+){1,2})(?=\s*\([A-Za-z0-9-]*\d[A-Za-z0-9-]*\))"),
        # Standalone signatory names: Sincerely, HR, Abdul Qadoos
        re.compile(r"(?:Sincerely|Regards|Respectfully)[\s,]+(?:[A-Z0-9,\s]{0,20}\n|\r|\s)*?([A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+){1,3})"),
    ],

    # 7. Company names
    "company_names": [
        re.compile(r"\b[A-Za-z0-9&.\s]{2,30}\s+(?:Inc\.?|LLC\.?|Ltd\.?|Corp\.?|Corporation|Company|Co\.|GmbH|Holdings|Garments|Logistics)\b", re.IGNORECASE),
    ],

    # 8. Medical record numbers
    "medical_record_numbers": [
        re.compile(r"\b(?:MRN|Medical\s*Record|Patient\s*ID|Rx|Health\s*ID)[\s#:.]*([A-Za-z0-9-]{4,20})\b", re.IGNORECASE),
    ],
}


def hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    """Convert hex color (#000000) to PyMuPDF RGB float tuple (0.0 to 1.0)."""
    h = (hex_str or "").lstrip("#")
    if len(h) == 3:
        h = "".join([c * 2 for c in h])
    if len(h) != 6:
        return (0.0, 0.0, 0.0)
    try:
        r = int(h[0:2], 16) / 255.0
        g = int(h[2:4], 16) / 255.0
        b = int(h[4:6], 16) / 255.0
        return (r, g, b)
    except Exception:
        return (0.0, 0.0, 0.0)


def redact_pdf(
    pdf_bytes: bytes,
    *,
    search_terms: list[str] | None = None,
    rectangles: list[dict[str, Any]] | None = None,
    patterns: list[str] | None = None,
    full_pages: list[int] | None = None,
    fill_color: str = "#000000",
    overlay_text: str | None = None,
    text_color: str = "#ffffff",
    scrub_metadata: bool = True,
    password: str | None = None,
    smart_prompt: str | None = None,
) -> bytes:
    """
    Permanently redact text, PII patterns, and rectangular regions from a PDF.

    search_terms: list of strings to search across all pages and redact.
    rectangles: list of dicts with {page: int, x: float, y: float, width: float, height: float, text: str, fill: str}.
    patterns: list of pattern keys, e.g. ["email", "phone", "credit_card", "ssn", "person_names", ...].
    full_pages: list of 1-based page numbers to completely redact.
    fill_color: default hex fill color for redactions (default black #000000).
    overlay_text: optional label to stamp over redacted area (e.g. "[REDACTED]").
    text_color: hex color for overlay text (default white #ffffff).
    scrub_metadata: whether to purge metadata, bookmarks, annotations, and hidden objects.
    password: optional password to encrypt the output PDF with AES-256.
    smart_prompt: optional custom prompt phrases to auto-redact (e.g. "plate number, salary").
    """
    log.info(
        "redact_pdf_start",
        initial_size=len(pdf_bytes),
        terms_count=len(search_terms or []),
        rects_count=len(rectangles or []),
        patterns=patterns,
        full_pages=full_pages,
        smart_prompt=bool(smart_prompt),
    )

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = doc.page_count
    if total_pages == 0:
        raise ValueError("PDF document has 0 pages.")

    default_fill_rgb = hex_to_rgb(fill_color)
    default_text_rgb = hex_to_rgb(text_color)

    # Combine smart_prompt phrases into search_terms
    all_search_terms = list(search_terms or [])
    if smart_prompt and smart_prompt.strip():
        for chunk in re.split(r"[,;\n]+", smart_prompt):
            c_clean = chunk.strip()
            if c_clean and len(c_clean) >= 2 and c_clean not in all_search_terms:
                all_search_terms.append(c_clean)

    # 1. Full-page redactions
    if full_pages:
        for p in full_pages:
            p_idx = int(p) - 1
            if 0 <= p_idx < total_pages:
                page = doc[p_idx]
                page_rect = page.rect
                page.add_redact_annot(
                    page_rect,
                    text=overlay_text or "[PAGE REDACTED]",
                    fill=default_fill_rgb,
                    text_color=default_text_rgb,
                )

    # 2. Term-based text search redaction
    if all_search_terms:
        for term in all_search_terms:
            t = str(term).strip()
            if not t:
                continue
            for pno in range(total_pages):
                page = doc[pno]
                matches = page.search_for(t)
                for rect in matches:
                    page.add_redact_annot(
                        rect,
                        text=overlay_text,
                        fill=default_fill_rgb,
                        text_color=default_text_rgb,
                    )

    # 3. PII Pattern Recognition (Email, Phone, Person Names, IDs, DOB, etc.)
    if patterns:
        active_pattern_lists: list[re.Pattern] = []
        for k in patterns:
            if k in PII_PATTERNS:
                active_pattern_lists.extend(PII_PATTERNS[k])

        if active_pattern_lists:
            for pno in range(total_pages):
                page = doc[pno]
                page_text = page.get_text("text")
                if not page_text:
                    continue

                for rgx in active_pattern_lists:
                    for match in rgx.finditer(page_text):
                        val = match.group(1) if match.groups() else match.group(0)
                        val = val.strip()
                        if not val or len(val) < 2:
                            continue

                        # If multi-line string was captured, search line by line
                        lines = [ln.strip() for ln in val.splitlines() if ln.strip()]
                        for line in lines:
                            if len(line) < 2:
                                continue
                            matches = page.search_for(line)
                            for rect in matches:
                                page.add_redact_annot(
                                    rect,
                                    text=overlay_text,
                                    fill=default_fill_rgb,
                                    text_color=default_text_rgb,
                                )

    # 4. Coordinate bounding box redactions (from visual drag-and-drop editor)
    if rectangles:
        for r in rectangles:
            try:
                page_idx = int(r.get("page", 1)) - 1
                if 0 <= page_idx < total_pages:
                    page = doc[page_idx]
                    fx = float(r.get("x", 0))
                    fy = float(r.get("y", 0))
                    fw = float(r.get("width", 100))
                    fh = float(r.get("height", 20))
                    rect = fitz.Rect(fx, fy, fx + fw, fy + fh)

                    r_fill = hex_to_rgb(r.get("fill_color", fill_color))
                    r_text_col = hex_to_rgb(r.get("text_color", text_color))
                    r_text = r.get("text") if r.get("text") is not None else overlay_text

                    page.add_redact_annot(
                        rect,
                        text=r_text,
                        fill=r_fill,
                        text_color=r_text_col,
                    )
            except Exception as err:
                log.warning("redact_rect_error", error=str(err))

    # 5. Apply all redactions across all pages (physically scrubs fonts & image raster pixels)
    for pno in range(total_pages):
        page = doc[pno]
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)

    # 6. Deep metadata, annotations, and object tree sanitization
    if scrub_metadata:
        doc.scrub(
            attached_files=True,
            clean_pages=True,
            embedded_files=True,
            hidden_text=True,
            javascript=True,
            metadata=True,
            redactions=True,
            thumbnails=True,
            xml_metadata=True,
        )

    # 7. Final output compilation (optional AES-256 encryption)
    if password:
        out_bytes = doc.tobytes(
            deflate=True,
            garbage=4,
            clean=True,
            user_pw=password,
            encryption=fitz.PDF_ENCRYPT_AES_256,
        )
    else:
        out_bytes = doc.tobytes(deflate=True, garbage=4, clean=True)

    doc.close()

    log.info("redact_pdf_completed", output_size=len(out_bytes))
    return out_bytes
