from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.api.deps import get_db, get_current_user
from app.repositories.trip_repo import TripRepository
from app.schemas.trip import TripCreate, TripResponse, TripUpdate
from sqlalchemy.orm import Session, joinedload
from app.models.trip import Trip
from app.models.trip_expense import TripExpense
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.item import Item
from app.models.purchase_place import PurchasePlace
from app.models.partner import Partner
from app.models.expense import Expense
from app.services.trip_service import TripService
router = APIRouter()


@router.get("/", response_model=Dict[str, Any])
def list_trips(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    start_date_from: Optional[str] = None,
    start_date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    trip_repo = TripRepository(db)
    return trip_repo.get_all(
        page=page,
        page_size=page_size,
        search=search,
        start_date_from=start_date_from,
        start_date_to=start_date_to
    )


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
            "expenses": [],
        }

    drivers = db.query(Driver).filter(Driver.is_active == True).all()
    vehicles = db.query(Vehicle).filter(Vehicle.is_active == True).all()
    items = db.query(Item).filter(Item.is_active == True).all()
    purchase_places = db.query(PurchasePlace).filter(PurchasePlace.is_active == True).all()
    partners = db.query(Partner).filter(Partner.is_active == True).all()
    expenses = db.query(Expense).filter(Expense.is_active == True).all()
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
        "expenses": [
            {
                "id": expense.id,
                "name": expense.name,
                "details": expense.details,
            }
            for expense in expenses
        ],
    }


@router.get("/{trip_id}", response_model=Dict[str, Any])
async def get_trip_by_id(trip_id: str, db: Optional[Session] = Depends(get_db)):
    """
    Get a specific trip by ID. Returns serialized trip with expense_items (including notes).
    """
    try:
        trip_repo = TripRepository(db)
        loaded = _trip_with_expenses(db, trip_id)
        if not loaded:
            raise HTTPException(status_code=404, detail=f"Trip with ID {trip_id} not found")
        return trip_repo._serialize_trip(loaded)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trip: {str(e)}")


def _trip_with_expenses(db: Session, trip_id: str):
    """Load trip with trip_expenses and expense for serialization."""
    return db.query(Trip).options(
        joinedload(Trip.trip_expenses).joinedload(TripExpense.expense)
    ).filter(Trip.id == trip_id).first()


@router.post("/", response_model=TripResponse)
async def create_trip(trip: TripCreate, db: Optional[Session] = Depends(get_db), user_id: str = Depends(get_current_user)):
    """
    Create a new trip
    """
    try:
        service = TripService(db)
        created = service.create_trip(trip, user_id)
        trip_repo = TripRepository(db)
        loaded = _trip_with_expenses(db, created.id)
        return trip_repo._serialize_trip(loaded) if loaded else trip_repo._serialize_trip(created)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating trip: {str(e)}")


@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: str,
    trip: TripUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    service = TripService(db)
    service.update_trip(trip_id, trip, user_id)
    trip_repo = TripRepository(db)
    loaded = _trip_with_expenses(db, trip_id)
    if not loaded:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip_repo._serialize_trip(loaded)



@router.delete("/{trip_id}")
async def delete_trip(trip_id: str, db: Optional[Session] = Depends(get_db)):
    """
    Delete a trip
    """
    try:
        trip_repo = TripRepository(db)
        deleted = trip_repo.delete(trip_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Trip with ID {trip_id} not found")
        return {"message": "Trip deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting trip: {str(e)}")

