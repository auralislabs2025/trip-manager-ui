from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from app.models.auditmixin import AuditMixin

class TripExpense(Base, AuditMixin):
    __tablename__ = "trip_expenses"

    id = Column(String, primary_key=True, default=lambda: f"texp_{uuid.uuid4().hex[:8]}")
    trip_id = Column(String, ForeignKey("trips.id"), nullable=False)
    expense_id = Column(String, ForeignKey("expenses.id"), nullable=False)

    amount = Column(Float, nullable=False,default=0.0)
    notes = Column(String, nullable=True)

    trip = relationship("Trip", back_populates="trip_expenses")
    expense = relationship("Expense", back_populates="trip_expenses")
