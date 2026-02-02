from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.partner import Partner
from app.models.item import Item
from app.models.purchase_place import PurchasePlace
from app.schemas.trip import TripCreate, TripUpdate
from typing import List, Optional, Dict, Any
from pathlib import Path
import json
import logging
from app.models.trip_expense import TripExpense
logger = logging.getLogger(__name__)

# Path to JSON file as fallback
JSON_FILE_PATH = Path(__file__).parent.parent.parent.parent / "data" / "trips.json"

def read_trips_from_json() -> List[Dict[str, Any]]:
    """Read trips from JSON file as fallback"""
    try:
        if not JSON_FILE_PATH.exists():
            return []
        with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading trips from JSON: {e}")
        return []

def convert_json_to_trip_dict(json_trip: Dict[str, Any]) -> Dict[str, Any]:
    """Convert JSON trip format to database model format"""
    return {
        "id": json_trip.get("id"),
        "trip_start_date": json_trip.get("tripStartDate"),
        "estimated_end_date": json_trip.get("estimatedEndDate"),
        "vehicle_number": json_trip.get("vehicleNumber"),
        "driver_name": json_trip.get("driverName"),
        "partner": json_trip.get("partner"),
        "purchase_place": json_trip.get("purchasePlace"),
        "item_name": json_trip.get("itemName"),
        "starting_km": json_trip.get("startingKm"),
        "ending_km": json_trip.get("endingKm"),
        "distance": json_trip.get("distance"),
        "tonnage": json_trip.get("tonnage"),
        "rate_per_ton": json_trip.get("ratePerTon"),
        "freight": json_trip.get("freight"),
        "expenses": json_trip.get("expenses", {}),
        "total_expenses": json_trip.get("totalExpenses", 0.0),
        "revenue": json_trip.get("revenue", 0.0),
        "profit": json_trip.get("profit", 0.0),
        "status": json_trip.get("status", "draft"),
        "locked": json_trip.get("locked", False),
        "amount_given_to_driver": json_trip.get("amountGivenToDriver"),
        "notes": json_trip.get("notes"),
    }

class TripRepository:
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.use_db = db is not None

    def get_all(
        self,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        start_date_from: Optional[str] = None,
        start_date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all trips - from database if available, else from JSON"""
        if self.use_db:
            try:
                query = (
                    self.db.query(Trip)
                    .filter(Trip.is_active == True)
                    .outerjoin(Trip.vehicle)
                    .outerjoin(Trip.driver)
                    .outerjoin(Trip.partner)
                    .outerjoin(Trip.item)
                    .outerjoin(Trip.purchase_place)
                    .options(
                        joinedload(Trip.vehicle),
                        joinedload(Trip.driver),
                        joinedload(Trip.purchase_place),
                        joinedload(Trip.item),
                        joinedload(Trip.partner),
                        joinedload(Trip.trip_expenses)
                            .joinedload(TripExpense.expense)
                    )
                )
                if search:
                    search_value = f"%{search.strip().lower()}%"
                    query = query.filter(
                        or_(
                            func.lower(Vehicle.vehicle_number).like(search_value),
                            func.lower(Driver.name).like(search_value),
                            func.lower(Partner.name).like(search_value),
                            func.lower(Item.name).like(search_value),
                            func.lower(PurchasePlace.name).like(search_value),
                        )
                    )
                if start_date_from:
                    query = query.filter(Trip.trip_start_date >= start_date_from)
                if start_date_to:
                    query = query.filter(Trip.trip_start_date <= start_date_to)
                totals_row = query.with_entities(
                    func.coalesce(func.sum(Trip.revenue), 0.0),
                    func.coalesce(func.sum(Trip.total_expenses), 0.0),
                    func.coalesce(func.sum(Trip.profit), 0.0)
                ).first()
                totals = {
                    "revenue": float(totals_row[0] or 0.0),
                    "expenses": float(totals_row[1] or 0.0),
                    "profit": float(totals_row[2] or 0.0),
                }
                total = query.count()
                offset = (page - 1) * page_size
                trips = query.offset(offset).limit(page_size).all()
                return {
                    "items": [self._serialize_trip(trip) for trip in trips],
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "totals": totals,
                }
            except Exception as e:
                logger.warning(f"Database query failed, {e}")
                self.use_db = False
    
    def get_by_id(self, trip_id: str) -> Trip | None:
        return self.db.query(Trip).filter(Trip.id == trip_id).first()

    def create(self, trip: Trip) -> Trip:
        """Create a new trip"""
        self.db.add(trip)
        self.db.flush()
        return trip

    def update(self, trip_id: str, trip_data: TripUpdate) -> Optional[Dict[str, Any]]:
        """Update an existing trip"""
        if self.use_db:
            try:
                db_trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
                if not db_trip:
                    return None
                
                update_data = trip_data.model_dump(exclude_unset=True)
                for key, value in update_data.items():
                    setattr(db_trip, key, value)
                
                self.db.commit()
                self.db.refresh(db_trip)
                return self._serialize_trip(db_trip)
            except Exception as e:
                logger.error(f"Database update failed: {e}")
                self.db.rollback()
                raise
        
        # If no database, raise error
        raise Exception("Database not available for updating trips")

    def delete(self, trip_id: str) -> bool:
        """Delete a trip"""
        if self.use_db:
            try:
                db_trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
                if not db_trip:
                    return False
                db_trip.is_active = False
                self.db.commit()
                return True
            except Exception as e:
                logger.error(f"Database delete failed: {e}")
                self.db.rollback()
                raise
        
        # If no database, raise error
        raise Exception("Database not available for deleting trips")

    def _serialize_trip(self, trip: Trip) -> Dict[str, Any]:
        expense_items = []
        expenses_map = {}
        if getattr(trip, "trip_expenses", None):
            for trip_expense in trip.trip_expenses:
                expense_name = trip_expense.expense.name if trip_expense.expense else None
                expense_items.append({
                    "expense_id": trip_expense.expense_id,
                    "expense_name": expense_name,
                    "amount": trip_expense.amount,
                })
                if expense_name:
                    key = expense_name.strip().lower().replace(" ", "_")
                    expenses_map[key] = trip_expense.amount

        return {
            "id": trip.id,
            "trip_start_date": trip.trip_start_date,
            "estimated_end_date": trip.estimated_end_date,
            "vehicle_id": trip.vehicle_id,
            "driver_id": trip.driver_id,
            "purchase_place_id": trip.purchase_place_id,
            "item_id": trip.item_id,
            "partner_id": trip.partner_id,
            "starting_km": trip.starting_km,
            "ending_km": trip.ending_km,
            "distance": trip.distance,
            "tonnage": trip.tonnage,
            "rate_per_ton": trip.rate_per_ton,
            "expenses": expenses_map,
            "expense_items": expense_items,
            "total_expenses": trip.total_expenses,
            "revenue": trip.revenue,
            "profit": trip.profit,
            "status": trip.status,
            "locked": trip.locked,
            "amount_given_to_driver": trip.amount_given_to_driver,
            "notes": trip.notes,
            "is_active": trip.is_active,
            "created_at": trip.created_at,
            "updated_at": trip.updated_at,
            "created_by": trip.created_by,
            "updated_by": trip.updated_by,
        }

