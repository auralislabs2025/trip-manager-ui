import uuid
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class PartnerType(PyEnum):
    CUSTOMER = "CUSTOMER"
    VENDOR = "VENDOR"
    PARTNER = "PARTNER"


class Partner(Base, AuditMixin):
    __tablename__ = "partners"

    id = Column(
        String,
        primary_key=True,
        default=lambda: f"partner_{uuid.uuid4().hex[:8]}"
    )

    name = Column(String, unique=True, nullable=False)

    partner_type = Column(
        Enum(
            PartnerType,
            values_callable=lambda e: [x.value for x in e],
            name="partner_type_enum"
        ),
        nullable=False,
        default=PartnerType.PARTNER,
        index=True
    )

    # Contact details
    contact_info = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    # Business identifiers
    gst_number = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Notes
    notes = Column(String, nullable=True)

    # OPTIONAL relationship (add only if you need reverse access)
    trips = relationship(
        "Trip",
        back_populates="partner"
    )
