"""V1 API router — registers all feature routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, files, jobs, health, dashboard

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
