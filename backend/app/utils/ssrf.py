"""SSRF protection utility for safe outbound HTTP requests."""

import ipaddress
import socket
from urllib.parse import urlparse
import httpx
from fastapi import HTTPException, status


class SSRFProtectionError(HTTPException):
    def __init__(self, detail: str = "Request to the specified URL is forbidden for security reasons."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def validate_url_safe(url: str) -> None:
    """
    Validate that a URL:
    1. Uses http or https scheme.
    2. Does not resolve to private, loopback, link-local, cloud metadata (169.254.x.x), or reserved IP addresses.
    """
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFProtectionError("Only HTTP and HTTPS URLs are supported.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFProtectionError("Invalid URL: missing hostname.")

    # Check for direct metadata or localhost strings
    lower_host = hostname.lower()
    if lower_host in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
        raise SSRFProtectionError("Access to internal or loopback addresses is forbidden.")

    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)

    try:
        addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise SSRFProtectionError(f"Could not resolve host '{hostname}'.")

    for family, socktype, proto, canonname, sockaddr in addr_info:
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFProtectionError("Invalid IP address resolved from host.")

        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise SSRFProtectionError("Access to private, loopback, or metadata addresses is forbidden.")

        # Additional protection against 100.64.0.0/10 (CGNAT) and cloud metadata
        if isinstance(ip, ipaddress.IPv4Address):
            if ip in ipaddress.IPv4Network("100.64.0.0/10"):
                raise SSRFProtectionError("Access to shared address space is forbidden.")
            if ip in ipaddress.IPv4Network("169.254.0.0/16"):
                raise SSRFProtectionError("Access to cloud metadata service is forbidden.")


async def safe_fetch_url(
    url: str,
    headers: dict[str, str] | None = None,
    max_redirects: int = 4,
    max_bytes: int = 100 * 1024 * 1024,
    timeout: float = 30.0,
) -> tuple[bytes, httpx.Headers]:
    """
    Safely download data from a remote URL with SSRF checks on every redirect hop,
    enforcing maximum size bounds and strict connection timeouts.
    """
    current_url = url
    client_headers = headers or {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    async with httpx.AsyncClient(follow_redirects=False, timeout=httpx.Timeout(timeout, connect=10.0)) as client:
        for _ in range(max_redirects + 1):
            validate_url_safe(current_url)

            resp = await client.get(current_url, headers=client_headers)

            if resp.is_redirect:
                location = resp.headers.get("location")
                if not location:
                    raise SSRFProtectionError("Redirect missing location header.")
                # Resolve relative redirects
                from urllib.parse import urljoin
                current_url = urljoin(current_url, location)
                continue

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download file from cloud provider (HTTP {resp.status_code}). Please verify the link is public and accessible.",
                )

            # Check Content-Length header if available
            cl = resp.headers.get("content-length")
            if cl and cl.isdigit() and int(cl) > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum allowed size ({max_bytes // (1024 * 1024)} MB).",
                )

            content = resp.content
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum allowed size ({max_bytes // (1024 * 1024)} MB).",
                )

            return content, resp.headers

        raise SSRFProtectionError("Too many redirects encountered while fetching URL.")

