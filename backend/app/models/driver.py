from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(String, primary_key=True, default=lambda: f"driver_{uuid.uuid4().hex[:8]}")
    name = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

