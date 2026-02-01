from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# -------------------------
# Base schema (shared fields)
# -------------------------
class ExpenseBase(BaseModel):
    name: str
    details: Optional[str] = None
    is_active: bool = True


# -------------------------
# Create schema (request body)
# -------------------------
class ExpenseCreate(ExpenseBase):
    pass


# -------------------------
# Update schema (PATCH body)
# -------------------------
class ExpenseUpdate(BaseModel):
    name: Optional[str] = None
    details: Optional[str] = None
    is_active: Optional[bool] = None


# -------------------------
# Response schema (API output)
# -------------------------
class ExpenseResponse(BaseModel):
    id: str
    expense_code: str
    name: str
    details: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

