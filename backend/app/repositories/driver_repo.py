from app.models.driver import Driver
from app.schemas.driver import DriverCreate
from fastapi import HTTPException
from sqlalchemy import or_, func
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def get_driver_by_id(db, driver_id: str):
    return db.query(Driver).filter(Driver.id == driver_id).first()

def get_drivers(db, search: Optional[str] = None):
    query = db.query(Driver)
    search_value = (search or "").strip().lower()
    if search_value:
        query = query.filter(
            or_(
                func.lower(Driver.name).contains(search_value),
                func.lower(Driver.phone).contains(search_value),
                func.lower(Driver.license_number).contains(search_value),
            )
        )
    return query.all()

def create_driver(db, driver: DriverCreate):
    driver = Driver(**driver.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver
def get_driver(db, driver_id: str):
    return db.query(Driver).filter(Driver.id == driver_id).first()

def delete_driver(db, driver_id: str):
    driver = get_driver(db, driver_id)

    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Soft delete
    driver.is_active = False
    db.commit()

    return {"message": "Driver deactivated successfully"}

def update_driver(db, driver_id: str, data):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(driver, field, value)

    db.commit()
    db.refresh(driver)

    return driver