from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import ALL models here
from app.models.user import User
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.partner import Partner
from app.models.purchase_place import PurchasePlace
from app.models.item import Item
