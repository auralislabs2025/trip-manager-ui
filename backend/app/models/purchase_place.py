from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class PurchasePlace(Base):
    __tablename__ = "purchase_places"

    id = Column(String, primary_key=True, default=lambda: f"purchase_place_{uuid.uuid4().hex[:8]}")
    name = Column(String, unique=True, nullable=False)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

