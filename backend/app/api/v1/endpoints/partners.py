from fastapi import APIRouter, Depends
from typing import Optional
from app.api.deps import get_db, get_current_user
from app.schemas.partner import PartnerCreate, PartnerResponse, PartnerUpdate
from app.repositories.partner_repo import (
    get_partners,
    create_partner,
    get_partner,
    delete_partner,
    update_partner,
)

router = APIRouter()


@router.get("/", response_model=list[PartnerResponse])
def get_all_partners(
    search: Optional[str] = None,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    partners = get_partners(db, search=search)
    return partners


@router.post("/", response_model=PartnerResponse)
def create_partner_endpoint(
    partner: PartnerCreate,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    new_partner = create_partner(db, partner)
    return new_partner


@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner_by_id(
    partner_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    partner = get_partner(db, partner_id)
    return partner


@router.delete("/{partner_id}")
def delete_partner_by_id(
    partner_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
   return delete_partner(db, partner_id)


@router.put("/{partner_id}", response_model=PartnerResponse)
def update_partner_by_id(
    partner_id: str,
    partner: PartnerUpdate,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    updated_partner = update_partner(db, partner_id, partner)
    return updated_partner
