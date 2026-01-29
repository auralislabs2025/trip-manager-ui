from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# -------------------------
# Base schema (shared fields)
# -------------------------
class DriverBase(BaseModel):
    name: str
    phone: Optional[str] = None
    license_number: str
    is_active: bool = True


# -------------------------
# Create schema (request body)
# -------------------------
class DriverCreate(DriverBase):
    pass


# -------------------------
# Update schema (PATCH body)
# -------------------------
class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    is_active: Optional[bool] = None


# -------------------------
# Response schema (API output)
# -------------------------
class DriverResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    license_number: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
