"""Generic async repository — avoids repeating CRUD boilerplate in every feature."""

from typing import Any, Generic, Type, TypeVar
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Provides get, list, create, update, delete for any SQLAlchemy model."""

    def __init__(self, model: Type[ModelT], session: AsyncSession):
        self.model = model
        self.session = session

    async def get(self, id: UUID | str) -> ModelT | None:
        if isinstance(id, str):
            try:
                id = UUID(id)
            except ValueError:
                pass
        return await self.session.get(self.model, id)

    async def get_by(self, **kwargs: Any) -> ModelT | None:
        stmt = select(self.model).filter_by(**kwargs)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        order_by=None,
        **filters: Any,
    ) -> list[ModelT]:
        stmt = select(self.model).filter_by(**filters).offset(offset).limit(limit)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self, **filters: Any) -> int:
        stmt = select(func.count()).select_from(self.model).filter_by(**filters)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def create(self, **kwargs: Any) -> ModelT:
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, instance: ModelT, **kwargs: Any) -> ModelT:
        for key, value in kwargs.items():
            setattr(instance, key, value)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        await self.session.delete(instance)
        await self.session.flush()
