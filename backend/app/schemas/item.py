from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# -------------------------
# Base schema (shared fields)
# -------------------------
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


# -------------------------
# Create schema (request body)
# -------------------------
class ItemCreate(ItemBase):
    pass


# -------------------------
# Update schema (PATCH body)
# -------------------------
class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# -------------------------
# Response schema (API output)
# -------------------------
class ItemResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

