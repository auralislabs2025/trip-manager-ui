from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


def get_vehicle_by_id(db, vehicle_id: str):
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def get_vehicles(db):
    return db.query(Vehicle).filter(Vehicle.is_active == True).all()


def create_vehicle(db, vehicle: VehicleCreate):
    vehicle = Vehicle(**vehicle.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def get_vehicle(db, vehicle_id: str):
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def delete_vehicle(db, vehicle_id: str):
    vehicle = get_vehicle(db, vehicle_id)

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Soft delete
    vehicle.is_active = False
    db.commit()

    return {"message": "Vehicle deactivated successfully"}


def update_vehicle(db, vehicle_id: str, data):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)

    return vehicle

