from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.schemas.purchase_place import (
    PurchasePlaceCreate,
    PurchasePlaceResponse,
    PurchasePlaceUpdate,
)
from app.repositories.purchase_place_repo import (
    get_purchase_places,
    create_purchase_place,
    get_purchase_place,
    delete_purchase_place,
    update_purchase_place,
)

router = APIRouter()


@router.get("/", response_model=list[PurchasePlaceResponse])
def get_all_purchase_places(db = Depends(get_db)):
    purchase_places = get_purchase_places(db)
    return purchase_places


@router.post("/", response_model=PurchasePlaceResponse)
def create_purchase_place_endpoint(
    purchase_place: PurchasePlaceCreate,
    db = Depends(get_db)
):
    new_purchase_place = create_purchase_place(db, purchase_place)
    return new_purchase_place


@router.get("/{purchase_place_id}", response_model=PurchasePlaceResponse)
def get_purchase_place_by_id(
    purchase_place_id: str,
    db = Depends(get_db)
):
    purchase_place = get_purchase_place(db, purchase_place_id)
    return purchase_place


@router.delete("/{purchase_place_id}")
def delete_purchase_place_by_id(
    purchase_place_id: str,
    db = Depends(get_db)
):
   return delete_purchase_place(db, purchase_place_id)


@router.put("/{purchase_place_id}", response_model=PurchasePlaceResponse)
def update_purchase_place_by_id(
    purchase_place_id: str,
    purchase_place: PurchasePlaceUpdate,
    db = Depends(get_db)
):
    updated_purchase_place = update_purchase_place(db, purchase_place_id, purchase_place)
    return updated_purchase_place

