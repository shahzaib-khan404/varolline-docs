"""Unit tests — auth service state logic (no DB required)."""

import time
import pytest
from app.api.v1.endpoints.auth import _sign_state, _verify_state


def test_state_sign_and_verify():
    import secrets
    nonce = secrets.token_urlsafe(16)
    signed = _sign_state(nonce)
    assert _verify_state(signed) is True


def test_tampered_state_rejected():
    import secrets
    nonce = secrets.token_urlsafe(16)
    signed = _sign_state(nonce)
    # Flip a character in the signature portion
    tampered = signed[:-4] + "XXXX"
    assert _verify_state(tampered) is False


def test_invalid_state_format():
    assert _verify_state("not:a:valid:state:at:all:extra") is False
    assert _verify_state("") is False
