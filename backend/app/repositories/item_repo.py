from app.models.item import Item
from app.schemas.item import ItemCreate
from fastapi import HTTPException
from sqlalchemy import or_, func
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def get_item_by_id(db, item_id: str):
    return db.query(Item).filter(Item.id == item_id).first()


def get_items(db, search: Optional[str] = None):
    query = db.query(Item).filter(Item.is_active == True)
    search_value = (search or "").strip().lower()
    if search_value:
        query = query.filter(
            or_(
                func.lower(Item.name).contains(search_value),
                func.lower(Item.description).contains(search_value),
            )
        )
    return query.all()


def create_item(db, item: ItemCreate):
    item = Item(**item.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_item(db, item_id: str):
    return db.query(Item).filter(Item.id == item_id).first()


def delete_item(db, item_id: str):
    item = get_item(db, item_id)

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Soft delete
    item.is_active = False
    db.commit()

    return {"message": "Item deactivated successfully"}


def update_item(db, item_id: str, data):
    item = db.query(Item).filter(Item.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item

