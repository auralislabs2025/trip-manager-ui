from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.auditmixin import AuditMixin
import uuid

class Expense(Base, AuditMixin):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: f"exp_{uuid.uuid4().hex[:8]}")
    expense_code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)