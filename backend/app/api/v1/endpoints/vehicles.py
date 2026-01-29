from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate
from app.repositories.vehicle_repo import (
    get_vehicles,
    create_vehicle,
    get_vehicle,
    delete_vehicle,
    update_vehicle,
)

router = APIRouter()


@router.get("/", response_model=list[VehicleResponse])
def get_all_vehicles(db = Depends(get_db)):
    vehicles = get_vehicles(db)
    return vehicles


@router.post("/", response_model=VehicleResponse)
def create_vehicle_endpoint(
    vehicle: VehicleCreate,
    db = Depends(get_db)
):
    new_vehicle = create_vehicle(db, vehicle)
    return new_vehicle


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle_by_id(
    vehicle_id: str,
    db = Depends(get_db)
):
    vehicle = get_vehicle(db, vehicle_id)
    return vehicle


@router.delete("/{vehicle_id}")
def delete_vehicle_by_id(
    vehicle_id: str,
    db = Depends(get_db)
):
   return delete_vehicle(db, vehicle_id)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle_by_id(
    vehicle_id: str,
    vehicle: VehicleUpdate,
    db = Depends(get_db)
):
    updated_vehicle = update_vehicle(db, vehicle_id, vehicle)
    return updated_vehicle