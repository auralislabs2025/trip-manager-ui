import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class Trip(Base, AuditMixin):
    __tablename__ = "trips"

    # Primary Key
    id = Column(
        String,
        primary_key=True,
        default=lambda: f"trip_{uuid.uuid4().hex[:8]}"
    )

    # Dates (kept as string intentionally for ERP flexibility)
    trip_start_date = Column(String, nullable=False)
    estimated_end_date = Column(String, nullable=True)

    # Foreign Keys
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    purchase_place_id = Column(String, ForeignKey("purchase_places.id"), nullable=False)
    item_id = Column(String, ForeignKey("items.id"), nullable=True)
    partner_id = Column(String, ForeignKey("partners.id"), nullable=True)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    purchase_place = relationship("PurchasePlace", back_populates="trips")
    item = relationship("Item", back_populates="trips")
    partner = relationship("Partner", back_populates="trips")

    # Trip Metrics
    starting_km = Column(Float, nullable=True)
    ending_km = Column(Float, nullable=True)
    distance = Column(Float, nullable=True)

    tonnage = Column(Float, nullable=True)
    rate_per_ton = Column(Float, nullable=True)
    freight = Column(Float, nullable=True)

    # Financials
    expenses = Column(JSON, nullable=True, default=dict)
    total_expenses = Column(Float, nullable=False, default=0.0)
    revenue = Column(Float, nullable=False, default=0.0)
    profit = Column(Float, nullable=False, default=0.0)

    # Status & Control
    status = Column(String, nullable=False, default="draft")  # draft | closed
    locked = Column(Boolean, nullable=False, default=False)

    amount_given_to_driver = Column(Float, nullable=True)
    notes = Column(String, nullable=True)

    # Soft state
    is_active = Column(Boolean, nullable=False, default=True, index=True)
