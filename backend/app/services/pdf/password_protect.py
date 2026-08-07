"""
PDF password protection and permission control.

Uses PyMuPDF's built-in AES-256 encryption support.

Options:
  user_password  — password required to open the PDF (required)
  owner_password — password that grants full control (defaults to user_password)
  allow_printing — whether the document can be printed (default True)
  allow_copying  — whether text/image copying is allowed (default True)
"""

from __future__ import annotations

import structlog

log = structlog.get_logger(__name__)

# PyMuPDF permission bit flags
_PERM_PRINT = 4        # allow printing
_PERM_COPY = 16        # allow copying
_PERM_ANNOTATE = 32    # allow annotations


def password_protect(
    pdf_bytes: bytes,
    *,
    user_password: str,
    owner_password: str | None = None,
    allow_printing: bool = True,
    allow_copying: bool = True,
) -> bytes:
    """Return *pdf_bytes* encrypted with the given passwords and permissions."""
    import fitz

    if not user_password.strip():
        raise ValueError("User password must not be empty.")

    if owner_password is None:
        owner_password = user_password

    # Build permission mask
    perms = _PERM_ANNOTATE  # always allow annotations
    if allow_printing:
        perms |= _PERM_PRINT
    if allow_copying:
        perms |= _PERM_COPY

    log.info(
        "password_protect_start",
        allow_printing=allow_printing,
        allow_copying=allow_copying,
        perms=perms,
    )

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        result = doc.tobytes(
            encryption=fitz.PDF_ENCRYPT_AES_256,
            user_pw=user_password,
            owner_pw=owner_password,
            permissions=perms,
            garbage=4,
            deflate=True,
        )

    log.info("password_protect_done", size=len(result))
    return result
