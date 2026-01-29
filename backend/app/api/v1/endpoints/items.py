from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate
from app.repositories.item_repo import (
    get_items,
    create_item,
    get_item,
    delete_item,
    update_item,
)

router = APIRouter()


@router.get("/", response_model=list[ItemResponse])
def get_all_items(db = Depends(get_db)):
    items = get_items(db)
    return items


@router.post("/", response_model=ItemResponse)
def create_item_endpoint(
    item: ItemCreate,
    db = Depends(get_db)
):
    new_item = create_item(db, item)
    return new_item


@router.get("/{item_id}", response_model=ItemResponse)
def get_item_by_id(
    item_id: str,
    db = Depends(get_db)
):
    item = get_item(db, item_id)
    return item


@router.delete("/{item_id}")
def delete_item_by_id(
    item_id: str,
    db = Depends(get_db)
):
   return delete_item(db, item_id)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item_by_id(
    item_id: str,
    item: ItemUpdate,
    db = Depends(get_db)
):
    updated_item = update_item(db, item_id, item)
    return updated_item

