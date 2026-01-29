from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum


class PartnerType(str, Enum):
    CUSTOMER = "CUSTOMER"
    VENDOR = "VENDOR"
    PARTNER = "PARTNER"


# -------------------------
# Base schema (shared fields)
# -------------------------
class PartnerBase(BaseModel):
    name: str
    partner_type: PartnerType = PartnerType.PARTNER
    contact_info: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    registration_number: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None


# -------------------------
# Create schema (request body)
# -------------------------
class PartnerCreate(PartnerBase):
    pass


# -------------------------
# Update schema (PATCH body)
# -------------------------
class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    partner_type: Optional[PartnerType] = None
    contact_info: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    registration_number: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


# -------------------------
# Response schema (API output)
# -------------------------
class PartnerResponse(BaseModel):
    id: str
    name: str
    partner_type: PartnerType
    contact_info: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    gst_number: Optional[str]
    pan_number: Optional[str]
    registration_number: Optional[str]
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

