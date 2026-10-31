"""Unit tests for SSRF validation and HTML-to-PDF sanitization."""

import pytest
from app.utils.ssrf import validate_url_safe, SSRFProtectionError
from app.services.pdf.html_to_pdf import sanitize_html_for_pdf


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1:8000/api/v1/admin/users",
        "http://localhost:8000/",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.5/secret",
        "http://192.168.1.1/admin",
        "http://172.16.0.1/internal",
        "file:///etc/passwd",
        "gopher://127.0.0.1:6379",
        "ftp://127.0.0.1/",
    ],
)
def test_ssrf_blocks_private_and_internal_targets(url: str):
    with pytest.raises(SSRFProtectionError):
        validate_url_safe(url)


def test_html_sanitizer_removes_dangerous_tags_and_protocols():
    dangerous_html = """
    <html>
      <head>
        <script>alert('xss');</script>
        <base href="http://169.254.169.254/">
      </head>
      <body>
        <h1>Report</h1>
        <iframe src="http://localhost:8000/admin"></iframe>
        <img src="file:///etc/shadow" alt="test" onerror="alert(1)">
        <a href="javascript:steal()">Click</a>
      </body>
    </html>
    """
    cleaned = sanitize_html_for_pdf(dangerous_html)
    assert "<script>" not in cleaned
    assert "alert('xss')" not in cleaned
    assert "<iframe" not in cleaned
    assert "<base" not in cleaned
    assert "file://" not in cleaned
    assert "javascript:" not in cleaned
    assert "onerror=" not in cleaned
    assert "<h1>Report</h1>" in cleaned

