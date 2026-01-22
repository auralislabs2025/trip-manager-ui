from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.schemas.trip import TripCreate, TripUpdate
from typing import List, Optional, Dict, Any
from pathlib import Path
import json
import logging

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

    def get_all(self) -> List[Dict[str, Any]]:
        """Get all trips - from database if available, else from JSON"""
        if self.use_db:
            try:
                trips = self.db.query(Trip).all()
                return [trip.to_dict() for trip in trips]
            except Exception as e:
                logger.warning(f"Database query failed, falling back to JSON: {e}")
                self.use_db = False
        
        # Fallback to JSON
        return read_trips_from_json()

    def get_by_id(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Get trip by ID - from database if available, else from JSON"""
        if self.use_db:
            try:
                trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
                if trip:
                    return trip.to_dict()
            except Exception as e:
                logger.warning(f"Database query failed, falling back to JSON: {e}")
                self.use_db = False
        
        # Fallback to JSON
        trips = read_trips_from_json()
        return next((t for t in trips if t.get("id") == trip_id), None)

    def create(self, trip_data: TripCreate, created_by: Optional[str] = None) -> Dict[str, Any]:
        """Create a new trip"""
        if self.use_db:
            try:
                db_trip = Trip(
                    trip_start_date=trip_data.trip_start_date,
                    estimated_end_date=trip_data.estimated_end_date,
                    vehicle_number=trip_data.vehicle_number,
                    driver_name=trip_data.driver_name,
                    partner=trip_data.partner,
                    purchase_place=trip_data.purchase_place,
                    item_name=trip_data.item_name,
                    starting_km=trip_data.starting_km,
                    ending_km=trip_data.ending_km,
                    distance=trip_data.distance,
                    tonnage=trip_data.tonnage,
                    rate_per_ton=trip_data.rate_per_ton,
                    freight=trip_data.freight,
                    expenses=trip_data.expenses or {},
                    total_expenses=trip_data.total_expenses or 0.0,
                    revenue=trip_data.revenue or 0.0,
                    profit=trip_data.profit or 0.0,
                    status=trip_data.status,
                    locked=trip_data.locked,
                    amount_given_to_driver=trip_data.amount_given_to_driver,
                    notes=trip_data.notes,
                    created_by=created_by
                )
                self.db.add(db_trip)
                self.db.commit()
                self.db.refresh(db_trip)
                return db_trip.to_dict()
            except Exception as e:
                logger.error(f"Database create failed: {e}")
                self.db.rollback()
                raise
        
        # If no database, raise error (can't create without DB)
        raise Exception("Database not available for creating trips")

    def update(self, trip_id: str, trip_data: TripUpdate) -> Optional[Dict[str, Any]]:
        """Update an existing trip"""
        if self.use_db:
            try:
                db_trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
                if not db_trip:
                    return None
                
                update_data = trip_data.model_dump(exclude_unset=True)
                for key, value in update_data.items():
                    # Convert camelCase to snake_case
                    db_key = key
                    if key == "tripStartDate":
                        db_key = "trip_start_date"
                    elif key == "estimatedEndDate":
                        db_key = "estimated_end_date"
                    elif key == "vehicleNumber":
                        db_key = "vehicle_number"
                    elif key == "driverName":
                        db_key = "driver_name"
                    elif key == "purchasePlace":
                        db_key = "purchase_place"
                    elif key == "itemName":
                        db_key = "item_name"
                    elif key == "startingKm":
                        db_key = "starting_km"
                    elif key == "endingKm":
                        db_key = "ending_km"
                    elif key == "ratePerTon":
                        db_key = "rate_per_ton"
                    elif key == "totalExpenses":
                        db_key = "total_expenses"
                    elif key == "amountGivenToDriver":
                        db_key = "amount_given_to_driver"
                    
                    setattr(db_trip, db_key, value)
                
                self.db.commit()
                self.db.refresh(db_trip)
                return db_trip.to_dict()
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
                self.db.delete(db_trip)
                self.db.commit()
                return True
            except Exception as e:
                logger.error(f"Database delete failed: {e}")
                self.db.rollback()
                raise
        
        # If no database, raise error
        raise Exception("Database not available for deleting trips")

