"""V1 API router — registers all feature routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, files, jobs, health, dashboard, ads
from app.api.v1.endpoints.admin import (
    ads as admin_ads,
    analytics as admin_analytics,
    users as admin_users,
    operations as admin_operations,
    tools as admin_tools,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(ads.router, prefix="/ads", tags=["Ads"])
api_router.include_router(admin_ads.router, prefix="/admin/ads", tags=["Admin Ads"])
api_router.include_router(admin_analytics.router, prefix="/admin/analytics", tags=["Admin Analytics"])
api_router.include_router(admin_users.router, prefix="/admin/users", tags=["Admin Users"])
api_router.include_router(admin_operations.router, prefix="/admin/operations", tags=["Admin Operations"])
api_router.include_router(admin_tools.router, prefix="/admin/tools", tags=["Admin Tools"])
