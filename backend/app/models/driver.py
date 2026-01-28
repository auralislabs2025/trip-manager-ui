import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class Driver(Base, AuditMixin):
    __tablename__ = "drivers"

    id = Column(
        String,
        primary_key=True,
        default=lambda: f"driver_{uuid.uuid4().hex[:8]}"
    )

    # Driver Identity
    name = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    license_number = Column(String, nullable=False, unique=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Relationships
    trips = relationship(
        "Trip",
        back_populates="driver"
    )
