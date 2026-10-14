"""Seed script — ensures the designated admin user exists and is up-to-date."""

import asyncio
import structlog
from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User

log = structlog.get_logger(__name__)

PRIMARY_ADMIN_EMAIL = "saeedmian074@gmail.com"
PRIMARY_ADMIN_PASSWORD = "password123456"


async def init_db():
    async with AsyncSessionLocal() as session:
        # 1. Check if the designated admin user exists
        stmt = select(User).where(User.email == PRIMARY_ADMIN_EMAIL)
        result = await session.execute(stmt)
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=PRIMARY_ADMIN_EMAIL,
                full_name="Platform Administrator",
                hashed_password=hash_password(PRIMARY_ADMIN_PASSWORD),
                role="admin",
                is_active=True,
                is_verified=True,
            )
            session.add(admin_user)
            await session.commit()
            log.info("admin_created_successfully", email=PRIMARY_ADMIN_EMAIL, role="admin")
        else:
            # Ensure password, role and active flags are set
            admin_user.role = "admin"
            admin_user.is_active = True
            admin_user.is_verified = True
            admin_user.hashed_password = hash_password(PRIMARY_ADMIN_PASSWORD)
            await session.commit()
            log.info("admin_updated_successfully", email=PRIMARY_ADMIN_EMAIL, role="admin")

        # 2. Demote any other user that might have been assigned admin by mistake
        demote_stmt = (
            update(User)
            .where(User.email != PRIMARY_ADMIN_EMAIL, User.role == "admin")
            .values(role="user")
        )
        await session.execute(demote_stmt)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(init_db())
