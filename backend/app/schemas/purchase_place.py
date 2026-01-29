from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# -------------------------
# Base schema (shared fields)
# -------------------------
class PurchasePlaceBase(BaseModel):
    name: str
    location: Optional[str] = None
    is_active: bool = True


# -------------------------
# Create schema (request body)
# -------------------------
class PurchasePlaceCreate(PurchasePlaceBase):
    pass


# -------------------------
# Update schema (PATCH body)
# -------------------------
class PurchasePlaceUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


# -------------------------
# Response schema (API output)
# -------------------------
class PurchasePlaceResponse(BaseModel):
    id: str
    name: str
    location: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

