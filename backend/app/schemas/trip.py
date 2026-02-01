from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class TripBase(BaseModel):
    trip_start_date: str
    estimated_end_date: Optional[str] = None
    vehicle_id: str
    driver_id: str
    purchase_place_id: str
    item_id: Optional[str] = None
    partner_id: Optional[str] = None
    starting_km: Optional[float] = None
    ending_km: Optional[float] = None
    distance: Optional[float] = None
    tonnage: Optional[float] = None
    rate_per_ton: Optional[float] = None
    expense_items: Optional[List[Dict[str, Any]]] = None
    total_expenses: float = 0.0
    revenue: float = 0.0
    profit: float = 0.0
    status: str = "draft"
    locked: bool = False
    amount_given_to_driver: Optional[float] = None
    notes: Optional[str] = None
    is_active: bool = True

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    trip_start_date: Optional[str] = None
    estimated_end_date: Optional[str] = None
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    purchase_place_id: Optional[str] = None
    item_id: Optional[str] = None
    partner_id: Optional[str] = None
    starting_km: Optional[float] = None
    ending_km: Optional[float] = None
    distance: Optional[float] = None
    tonnage: Optional[float] = None
    rate_per_ton: Optional[float] = None
    expense_items: Optional[List[Dict[str, Any]]] = None
    total_expenses: Optional[float] = None
    revenue: Optional[float] = None
    profit: Optional[float] = None
    status: Optional[str] = None
    locked: Optional[bool] = None
    amount_given_to_driver: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class TripResponse(TripBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True

