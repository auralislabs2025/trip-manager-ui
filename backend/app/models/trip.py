from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, Integer
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Trip(Base):
    __tablename__ = "trips"

    id = Column(String, primary_key=True, default=lambda: f"trip_{uuid.uuid4().hex[:8]}")
    trip_start_date = Column(String, nullable=False)
    estimated_end_date = Column(String, nullable=True)
    vehicle_number = Column(String, nullable=False)
    driver_name = Column(String, nullable=False)
    partner = Column(String, nullable=True)
    purchase_place = Column(String, nullable=True)
    item_name = Column(String, nullable=True)
    starting_km = Column(Float, nullable=True)
    ending_km = Column(Float, nullable=True)
    distance = Column(Float, nullable=True)
    tonnage = Column(Float, nullable=True)
    rate_per_ton = Column(Float, nullable=True)
    freight = Column(Float, nullable=True)
    expenses = Column(JSON, nullable=True, default=dict)  # Store expenses as JSON
    total_expenses = Column(Float, nullable=True, default=0.0)
    revenue = Column(Float, nullable=True, default=0.0)
    profit = Column(Float, nullable=True, default=0.0)
    status = Column(String, nullable=False, default="draft")  # draft, closed
    locked = Column(Boolean, nullable=False, default=False)
    amount_given_to_driver = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String, nullable=True)

    def to_dict(self):
        """Convert model to dictionary matching JSON structure"""
        return {
            "id": self.id,
            "tripStartDate": self.trip_start_date,
            "estimatedEndDate": self.estimated_end_date,
            "vehicleNumber": self.vehicle_number,
            "driverName": self.driver_name,
            "partner": self.partner,
            "purchasePlace": self.purchase_place,
            "itemName": self.item_name,
            "startingKm": self.starting_km,
            "endingKm": self.ending_km,
            "distance": self.distance,
            "tonnage": self.tonnage,
            "ratePerTon": self.rate_per_ton,
            "freight": self.freight,
            "expenses": self.expenses or {},
            "totalExpenses": self.total_expenses or 0.0,
            "revenue": self.revenue or 0.0,
            "profit": self.profit or 0.0,
            "status": self.status,
            "locked": self.locked,
            "amountGivenToDriver": self.amount_given_to_driver,
            "notes": self.notes,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

