from fastapi import APIRouter
from app.api.v1.endpoints import users, health, trips, auth

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router, tags=["Auth"])
api_v1_router.include_router(users.router, tags=["Users"])
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(trips.router, prefix="/trips", tags=["Trips"])