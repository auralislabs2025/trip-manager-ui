from fastapi import APIRouter
from app.api.v1.endpoints import health,deps_demo

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router,tags=["Health"])
api_router.include_router(deps_demo.router,tags=["Deps Demo"])