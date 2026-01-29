from app.models.partner import Partner
from app.schemas.partner import PartnerCreate
from fastapi import HTTPException
from sqlalchemy import or_, func
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def get_partner_by_id(db, partner_id: str):
    return db.query(Partner).filter(Partner.id == partner_id).first()


def get_partners(db, search: Optional[str] = None):
    query = db.query(Partner).filter(Partner.is_active == True)
    search_value = (search or "").strip().lower()
    if search_value:
        query = query.filter(
            or_(
                func.lower(Partner.name).contains(search_value),
                func.lower(Partner.contact_info).contains(search_value),
                func.lower(Partner.email).contains(search_value),
                func.lower(Partner.phone).contains(search_value),
                func.lower(Partner.address).contains(search_value),
                func.lower(Partner.gst_number).contains(search_value),
                func.lower(Partner.pan_number).contains(search_value),
                func.lower(Partner.registration_number).contains(search_value),
                func.lower(Partner.notes).contains(search_value),
            )
        )
    return query.all()


def create_partner(db, partner: PartnerCreate):
    partner = Partner(**partner.model_dump())
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner


def get_partner(db, partner_id: str):
    return db.query(Partner).filter(Partner.id == partner_id).first()


def delete_partner(db, partner_id: str):
    partner = get_partner(db, partner_id)

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Soft delete
    partner.is_active = False
    db.commit()

    return {"message": "Partner deactivated successfully"}


def update_partner(db, partner_id: str, data):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(partner, field, value)

    db.commit()
    db.refresh(partner)

    return partner

