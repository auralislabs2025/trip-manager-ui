import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class Item(Base, AuditMixin):
    __tablename__ = "items"

    id = Column(
        String,
        primary_key=True,
        default=lambda: f"item_{uuid.uuid4().hex[:8]}"
    )

    # Item details
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Relationships
    trips = relationship(
        "Trip",
        back_populates="item"
    )
