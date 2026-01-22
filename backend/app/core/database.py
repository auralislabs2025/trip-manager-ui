from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with connection retry logic
def create_db_engine():
    """Create database engine with retry logic"""
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            engine = create_engine(
                settings.DATABASE_URL,
                pool_pre_ping=True,  # Verify connections before using
                pool_size=5,
                max_overflow=10,
                echo=settings.DEBUG
            )
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully")
            return engine
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database connection attempt {attempt + 1} failed: {e}. Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Failed to connect to database after {max_retries} attempts: {e}")
                logger.warning("Will use JSON fallback for data storage")
                return None

# Create engine (may be None if connection fails)
try:
    engine = create_db_engine()
except Exception as e:
    logger.error(f"Error creating database engine: {e}")
    engine = None

# Create session factory (only if engine is available)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

# Create base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    """Dependency to get database session - returns None if database unavailable"""
    if SessionLocal is None:
        yield None
        return
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

