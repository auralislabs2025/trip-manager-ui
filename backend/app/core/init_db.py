from app.core.database import Base, engine
from app.models import User, Trip, Vehicle, Driver, Partner, PurchasePlace, Item
import logging

logger = logging.getLogger(__name__)

def init_db():
    """Initialize database by creating all tables"""
    if engine is None:
        logger.warning("Database engine not available, skipping table creation. Will use JSON fallback.")
        return
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        logger.warning("Will use JSON fallback for data storage")

