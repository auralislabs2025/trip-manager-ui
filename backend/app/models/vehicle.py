from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, default=lambda: f"vehicle_{uuid.uuid4().hex[:8]}")
    vehicle_number = Column(String, unique=True, nullable=False)
    vehicle_type = Column(String, nullable=True, default="Truck")
    driver_name = Column(String, nullable=True)  # Current driver
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

