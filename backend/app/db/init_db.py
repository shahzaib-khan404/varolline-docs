"""Seed script — creates the first admin user in dev/staging environments."""

import asyncio

import structlog

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.repositories.user import UserRepository

log = structlog.get_logger(__name__)

ADMIN_EMAIL = "admin@varollinedocs.com"
ADMIN_PASSWORD = "Admin1234!"  # Change immediately after first login


async def init_db():
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        exists = await repo.email_exists(ADMIN_EMAIL)
        if not exists:
            await repo.create(
                email=ADMIN_EMAIL,
                full_name="Platform Admin",
                hashed_password=hash_password(ADMIN_PASSWORD),
                role="admin",
                is_active=True,
                is_verified=True,
            )
            await session.commit()
            log.info("admin_created", email=ADMIN_EMAIL)
        else:
            log.info("admin_already_exists", email=ADMIN_EMAIL)


if __name__ == "__main__":
    asyncio.run(init_db())
