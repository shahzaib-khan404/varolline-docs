"""Integration tests verifying strict authorization guards across all admin routes."""

import pytest
from httpx import ASGITransport, AsyncClient
from main import app
from app.core.security import create_access_token
from app.core.database import get_db
import uuid

ADMIN_ROUTES = [
    ("GET", "/api/v1/admin/ads/slots"),
    ("GET", "/api/v1/admin/analytics/overview"),
    ("GET", "/api/v1/admin/users"),
    ("GET", "/api/v1/admin/operations"),
    ("GET", "/api/v1/admin/tools"),
]


@pytest.mark.asyncio
async def test_admin_routes_reject_unauthenticated():
    """Verify that unauthenticated requests to any /admin/* route strictly return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for method, route in ADMIN_ROUTES:
            res = await ac.request(method, route)
            assert res.status_code == 401, f"{method} {route} allowed unauthenticated access! Status: {res.status_code}"
            data = res.json()
            assert data["detail"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_admin_routes_reject_non_admin_user(db):
    """Verify that authenticated non-admin users strictly receive 403 Forbidden on admin routes."""
    from app.models.user import User

    # Create normal non-admin user
    user = User(
        id=uuid.uuid4(),
        email=f"regular_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="fakehashedpassword",
        full_name="Regular User",
        is_active=True,
        role="user",
    )
    db.add(user)
    await db.commit()

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    app.dependency_overrides[get_db] = lambda: db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            for method, route in ADMIN_ROUTES:
                res = await ac.request(method, route, headers=headers)
                assert res.status_code == 403, f"{method} {route} allowed non-admin access! Status: {res.status_code}"
                data = res.json()
                assert data["detail"]["code"] == "FORBIDDEN"
    finally:
        app.dependency_overrides.clear()
