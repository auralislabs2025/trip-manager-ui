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
                return [self._serialize_trip(trip) for trip in trips]
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
                    return self._serialize_trip(trip)
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
                    vehicle_id=trip_data.vehicle_id,
                    driver_id=trip_data.driver_id,
                    purchase_place_id=trip_data.purchase_place_id,
                    item_id=trip_data.item_id,
                    partner_id=trip_data.partner_id,
                    starting_km=trip_data.starting_km,
                    ending_km=trip_data.ending_km,
                    distance=trip_data.distance,
                    tonnage=trip_data.tonnage,
                    rate_per_ton=trip_data.rate_per_ton,
                    freight=trip_data.freight,
                    expenses=trip_data.expenses or {},
                    total_expenses=trip_data.total_expenses,
                    revenue=trip_data.revenue,
                    profit=trip_data.profit,
                    status=trip_data.status,
                    locked=trip_data.locked,
                    amount_given_to_driver=trip_data.amount_given_to_driver,
                    notes=trip_data.notes,
                    is_active=trip_data.is_active,
                    created_by=created_by
                )
                self.db.add(db_trip)
                self.db.commit()
                self.db.refresh(db_trip)
                return self._serialize_trip(db_trip)
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
                self.db.delete(db_trip)
                self.db.commit()
                return True
            except Exception as e:
                logger.error(f"Database delete failed: {e}")
                self.db.rollback()
                raise
        
        # If no database, raise error
        raise Exception("Database not available for deleting trips")

    def _serialize_trip(self, trip: Trip) -> Dict[str, Any]:
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
            "freight": trip.freight,
            "expenses": trip.expenses,
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

