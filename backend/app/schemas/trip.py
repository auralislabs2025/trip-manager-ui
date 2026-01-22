from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ExpenseBreakdown(BaseModel):
    food: float = 0.0
    diesel: float = 0.0
    toll: float = 0.0
    salary: float = 0.0
    gst: float = 0.0
    other: float = 0.0
    other_description: Optional[str] = None

class TripBase(BaseModel):
    trip_start_date: str = Field(..., alias="tripStartDate")
    estimated_end_date: Optional[str] = Field(None, alias="estimatedEndDate")
    vehicle_number: str = Field(..., alias="vehicleNumber")
    driver_name: str = Field(..., alias="driverName")
    partner: Optional[str] = None
    purchase_place: Optional[str] = Field(None, alias="purchasePlace")
    item_name: Optional[str] = Field(None, alias="itemName")
    starting_km: Optional[float] = Field(None, alias="startingKm")
    ending_km: Optional[float] = Field(None, alias="endingKm")
    distance: Optional[float] = None
    tonnage: Optional[float] = None
    rate_per_ton: Optional[float] = Field(None, alias="ratePerTon")
    freight: Optional[float] = None
    expenses: Optional[Dict[str, Any]] = {}
    total_expenses: Optional[float] = Field(0.0, alias="totalExpenses")
    revenue: Optional[float] = 0.0
    profit: Optional[float] = 0.0
    status: str = "draft"
    locked: bool = False
    amount_given_to_driver: Optional[float] = Field(None, alias="amountGivenToDriver")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "tripStartDate": "2024-01-15",
                "estimatedEndDate": "2024-01-20",
                "vehicleNumber": "TN 01 AB 1234",
                "driverName": "Rajesh Kumar",
                "partner": "ABC Transport",
                "purchasePlace": "Chennai Port",
                "itemName": "Rice",
                "startingKm": 5000,
                "endingKm": 5850,
                "distance": 850,
                "tonnage": 15.5,
                "ratePerTon": 650,
                "freight": 10075,
                "expenses": {
                    "food": 500,
                    "diesel": 3200,
                    "toll": 800,
                    "salary": 2000,
                    "gst": 0,
                    "other": 500
                },
                "totalExpenses": 7000,
                "revenue": 10075,
                "profit": 3075,
                "status": "closed",
                "locked": True,
                "amountGivenToDriver": 2000,
                "notes": "Delivery completed on time"
            }
        }

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    trip_start_date: Optional[str] = Field(None, alias="tripStartDate")
    estimated_end_date: Optional[str] = Field(None, alias="estimatedEndDate")
    vehicle_number: Optional[str] = Field(None, alias="vehicleNumber")
    driver_name: Optional[str] = Field(None, alias="driverName")
    partner: Optional[str] = None
    purchase_place: Optional[str] = Field(None, alias="purchasePlace")
    item_name: Optional[str] = Field(None, alias="itemName")
    starting_km: Optional[float] = Field(None, alias="startingKm")
    ending_km: Optional[float] = Field(None, alias="endingKm")
    distance: Optional[float] = None
    tonnage: Optional[float] = None
    rate_per_ton: Optional[float] = Field(None, alias="ratePerTon")
    freight: Optional[float] = None
    expenses: Optional[Dict[str, Any]] = None
    total_expenses: Optional[float] = Field(None, alias="totalExpenses")
    revenue: Optional[float] = None
    profit: Optional[float] = None
    status: Optional[str] = None
    locked: Optional[bool] = None
    amount_given_to_driver: Optional[float] = Field(None, alias="amountGivenToDriver")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True

class TripResponse(TripBase):
    id: str
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    created_by: Optional[str] = None

    class Config:
        populate_by_name = True
        from_attributes = True

