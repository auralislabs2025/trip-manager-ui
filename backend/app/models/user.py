import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.auditmixin import AuditMixin


class User(Base, AuditMixin):
    __tablename__ = "users"

    id = Column(
        String,
        primary_key=True,
        default=lambda: f"user_{uuid.uuid4().hex[:8]}"
    )

    # Identity
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=True, index=True)

    # Authentication
    password_hash = Column(String, nullable=False)

    # Authorization
    role = Column(String, nullable=False, default="staff")  
    # examples: admin, staff

    # Account state
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
