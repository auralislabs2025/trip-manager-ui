from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass


class AuditMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
