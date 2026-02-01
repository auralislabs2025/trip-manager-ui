from sqlalchemy.orm import Session
from app.models.trip_expense import TripExpense
class TripExpenseRepository:
    def __init__(self, db: Session):
        self.db = db

    def bulk_create(self, items: list[TripExpense]):
        self.db.add_all(items)

        
    def delete_by_trip_id(self, trip_id: str):
        self.db.query(TripExpense).filter(
            TripExpense.trip_id == trip_id
        ).delete()