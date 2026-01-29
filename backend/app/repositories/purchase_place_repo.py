from app.models.purchase_place import PurchasePlace
from app.schemas.purchase_place import PurchasePlaceCreate
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


def get_purchase_place_by_id(db, purchase_place_id: str):
    return db.query(PurchasePlace).filter(PurchasePlace.id == purchase_place_id).first()


def get_purchase_places(db):
    return db.query(PurchasePlace).all()


def create_purchase_place(db, purchase_place: PurchasePlaceCreate):
    purchase_place = PurchasePlace(**purchase_place.model_dump())
    db.add(purchase_place)
    db.commit()
    db.refresh(purchase_place)
    return purchase_place


def get_purchase_place(db, purchase_place_id: str):
    return db.query(PurchasePlace).filter(PurchasePlace.id == purchase_place_id).first()


def delete_purchase_place(db, purchase_place_id: str):
    purchase_place = get_purchase_place(db, purchase_place_id)

    if not purchase_place:
        raise HTTPException(status_code=404, detail="Purchase place not found")

    # Soft delete
    purchase_place.is_active = False
    db.commit()

    return {"message": "Purchase place deactivated successfully"}


def update_purchase_place(db, purchase_place_id: str, data):
    purchase_place = db.query(PurchasePlace).filter(PurchasePlace.id == purchase_place_id).first()

    if not purchase_place:
        raise HTTPException(status_code=404, detail="Purchase place not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(purchase_place, field, value)

    db.commit()
    db.refresh(purchase_place)

    return purchase_place

