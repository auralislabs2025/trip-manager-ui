from fastapi import APIRouter
from app.api.v1.endpoints import (
    users,
    health,
    trips,
    auth,
    drivers,
    vehicles,
    items,
    purchase_places,
    partners,
)

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router, tags=["Auth"])
api_v1_router.include_router(users.router, tags=["Users"])
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(trips.router, prefix="/trips", tags=["Trips"])
api_v1_router.include_router(drivers.router, prefix="/masters/drivers", tags=["Drivers"])
api_v1_router.include_router(items.router, prefix="/masters/items", tags=["Items"])
api_v1_router.include_router(vehicles.router, prefix="/masters/vehicles", tags=["Vehicles"])
api_v1_router.include_router(
    purchase_places.router,
    prefix="/masters/purchase-places",
    tags=["Purchase Places"],
)
api_v1_router.include_router(partners.router, prefix="/masters/partners", tags=["Partners"])