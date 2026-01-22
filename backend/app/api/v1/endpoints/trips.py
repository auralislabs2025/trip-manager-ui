from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.repositories.trip_repo import TripRepository
from sqlalchemy.orm import Session

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

