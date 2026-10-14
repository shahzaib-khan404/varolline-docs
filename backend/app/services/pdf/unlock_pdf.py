"""
PDF Unlock service — removes owner/user passwords and decrypts PDF files.
"""

from __future__ import annotations

import structlog
import fitz

log = structlog.get_logger(__name__)


def unlock_pdf(pdf_bytes: bytes, *, password: str = "") -> bytes:
    """
    Decrypt an encrypted PDF or remove owner permission restrictions.

    Args:
        pdf_bytes: Raw bytes of the encrypted PDF.
        password: The user password if required, or empty string for owner-restricted PDFs.

    Returns:
        Decrypted, unrestricted PDF bytes.
    """
    log.info("unlock_pdf_start", initial_size=len(pdf_bytes), has_password=bool(password))

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        if doc.is_encrypted:
            # Attempt to authenticate with given password (or empty string)
            authenticated = doc.authenticate(password)
            if not authenticated:
                raise ValueError("Incorrect password provided. Unable to unlock this PDF.")

        # Save without encryption and with clean stream
        result = doc.tobytes(
            garbage=4,
            deflate=True,
            encryption=fitz.PDF_ENCRYPT_NONE,
        )

    log.info("unlock_pdf_done", output_size=len(result))
    return result
