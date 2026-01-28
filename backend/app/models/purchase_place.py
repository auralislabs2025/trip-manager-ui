import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class PurchasePlace(Base, AuditMixin):
    __tablename__ = "purchase_places"

    id = Column(
        String,
        primary_key=True,
        default=lambda: f"purchase_place_{uuid.uuid4().hex[:8]}"
    )

    # Place details
    name = Column(String, unique=True, nullable=False)
    location = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # OPTIONAL relationship (add only if you need reverse access)
    trips = relationship(
        "Trip",
        back_populates="purchase_place"
    )
