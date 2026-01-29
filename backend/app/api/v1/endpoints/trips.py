from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.api.deps import get_db
from app.repositories.trip_repo import TripRepository
from sqlalchemy.orm import Session
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.item import Item
from app.models.purchase_place import PurchasePlace
from app.models.partner import Partner

router = APIRouter()


@router.get("/", response_model=List[Dict[str, Any]])
async def get_trips(db: Optional[Session] = Depends(get_db)):
    """
    Get all trips from the database (with JSON fallback)
    """
    try:
        trip_repo = TripRepository(db)
        trips = trip_repo.get_all()
        return trips
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trips: {str(e)}")


@router.get("/masters", response_model=Dict[str, List[Dict[str, Any]]])
async def get_trip_masters(db = Depends(get_db)):
    """
    Get master data needed for trip dropdowns (drivers, vehicles, items, purchase places, partners).
    """
    if db is None:
        return {
            "drivers": [],
            "vehicles": [],
            "items": [],
            "purchase_places": [],
            "partners": [],
        }

    drivers = db.query(Driver).filter(Driver.is_active == True).all()
    vehicles = db.query(Vehicle).filter(Vehicle.is_active == True).all()
    items = db.query(Item).filter(Item.is_active == True).all()
    purchase_places = db.query(PurchasePlace).filter(PurchasePlace.is_active == True).all()
    partners = db.query(Partner).filter(Partner.is_active == True).all()

    return {
        "drivers": [
            {
                "id": driver.id,
                "name": driver.name,
                "phone": driver.phone,
                "license_number": driver.license_number,
            }
            for driver in drivers
        ],
        "vehicles": [
            {
                "id": vehicle.id,
                "vehicle_number": vehicle.vehicle_number,
                "vehicle_type": vehicle.vehicle_type,
                "current_driver_name": vehicle.current_driver_name,
            }
            for vehicle in vehicles
        ],
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
            }
            for item in items
        ],
        "purchase_places": [
            {
                "id": purchase_place.id,
                "name": purchase_place.name,
                "location": purchase_place.location,
            }
            for purchase_place in purchase_places
        ],
        "partners": [
            {
                "id": partner.id,
                "name": partner.name,
                "partner_type": partner.partner_type,
            }
            for partner in partners
        ],
    }


@router.get("/{trip_id}")
async def get_trip_by_id(trip_id: str, db: Optional[Session] = Depends(get_db)):
    """
    Get a specific trip by ID from the database (with JSON fallback)
    """
    try:
        trip_repo = TripRepository(db)
        trip = trip_repo.get_by_id(trip_id)
        
        if not trip:
            raise HTTPException(status_code=404, detail=f"Trip with ID {trip_id} not found")
        
        return trip
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trip: {str(e)}")

