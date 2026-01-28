import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class Vehicle(Base, AuditMixin):
    __tablename__ = "vehicles"

    id = Column(
        String,
        primary_key=True,
        default=lambda: f"vehicle_{uuid.uuid4().hex[:8]}"
    )

    # Vehicle details
    vehicle_number = Column(String, unique=True, nullable=False, index=True)
    vehicle_type = Column(String, nullable=True, default="Truck")

    # Optional current assignment info
    current_driver_name = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Relationships (recommended)
    trips = relationship(
        "Trip",
        back_populates="vehicle"
    )
