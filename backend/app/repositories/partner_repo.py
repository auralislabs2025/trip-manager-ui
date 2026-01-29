from app.models.partner import Partner
from app.schemas.partner import PartnerCreate
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


def get_partner_by_id(db, partner_id: str):
    return db.query(Partner).filter(Partner.id == partner_id).first()


def get_partners(db):
    return db.query(Partner).all()


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

