from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# -------------------------
# Base schema (shared fields)
# -------------------------
class VehicleBase(BaseModel):
    vehicle_number: str
    vehicle_type: Optional[str] = None
    current_driver_name: Optional[str] = None
    is_active: bool = True


# -------------------------
# Create schema (request body)
# -------------------------
class VehicleCreate(VehicleBase):
    pass


# -------------------------
# Update schema (PATCH body)
# -------------------------
class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    current_driver_name: Optional[str] = None
    is_active: Optional[bool] = None


# -------------------------
# Response schema (API output)
# -------------------------
class VehicleResponse(BaseModel):
    id: str
    vehicle_number: str
    vehicle_type: Optional[str]
    current_driver_name: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

