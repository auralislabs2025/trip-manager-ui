from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.models.trip_expense import TripExpense
from app.repositories.trip_repo import TripRepository
from app.repositories.trip_expense_repo import TripExpenseRepository
from app.schemas.trip import TripCreate
from app.schemas.trip import TripUpdate
class TripService:
    def __init__(self, db: Session):
        self.db = db
        self.trip_repo = TripRepository(db)
        self.trip_expense_repo = TripExpenseRepository(db)

    def create_trip(self, data: TripCreate, user_id: str | None = None) -> Trip:
        """
        Business logic for creating a trip
        """
        try:
        # 1️⃣ Map request → model
            trip = Trip(
                        trip_start_date=data.trip_start_date,
                        estimated_end_date=data.estimated_end_date,
                        vehicle_id=data.vehicle_id,
                        driver_id=data.driver_id,
                        purchase_place_id=data.purchase_place_id,
                        item_id=data.item_id,
                        partner_id=data.partner_id,
                        starting_km=data.starting_km,
                        ending_km=data.ending_km,
                        distance=data.distance,
                        tonnage=data.tonnage,
                        rate_per_ton=data.rate_per_ton,
                        total_expenses=data.total_expenses,
                        revenue=data.revenue,
                        profit=data.profit,
                        status=data.status,
                        locked=data.locked,
                        amount_given_to_driver=data.amount_given_to_driver,
                        notes=data.notes,
                        is_active=data.is_active,
                        created_by=user_id
            )

            # 3️⃣ Save via repo
            self.trip_repo.create(trip)

            # 2️⃣ Create TripExpense pivot rows
            if data.expense_items:
                expense_rows = []

                for item in data.expense_items:
                    expense_rows.append(
                        TripExpense(
                            trip_id=trip.id,
                            expense_id=item["expense_id"],
                            amount=item["amount"],
                            notes=item.get("notes"),
                            created_by=user_id
                        )
                    )

                self.trip_expense_repo.bulk_create(expense_rows)

            # 3️⃣ Commit everything together
            self.db.commit()
            self.db.refresh(trip)

            return trip

        except Exception:
            self.db.rollback()
            raise


    def list_trips(self) -> list[dict]:
        trips = self.trip_repo.get_all()

        result = []

        for trip in trips:
            result.append({
                "id": trip.id,
                "trip_start_date": trip.trip_start_date,

                "vehicle": {
                    "id": trip.vehicle.id,
                    "vehicle_number": trip.vehicle.vehicle_number
                } if trip.vehicle else None,

                "driver": {
                    "id": trip.driver.id,
                    "name": trip.driver.name
                } if trip.driver else None,

                "purchase_place": {
                    "id": trip.purchase_place.id,
                    "name": trip.purchase_place.name
                } if trip.purchase_place else None,

                "expenses": [
                    {
                        "expense_id": te.expense.id,
                        "expense_name": te.expense.name,
                        "amount": te.amount,
                        "notes": te.notes
                    }
                    for te in trip.trip_expenses
                ],

                "total_expense": sum(
                    te.amount for te in trip.trip_expenses
                )
            })

        return result
    
    
    
    
    def update_trip(
        self,
        trip_id: str,
        data: TripUpdate,
        user_id: str
    ) -> Trip:
        try:
            trip = self.trip_repo.get_by_id(trip_id)

            if not trip:
                raise ValueError("Trip not found")

            # Optional rule: prevent update if locked
            if trip.locked:
                raise ValueError("Trip is locked and cannot be updated")

            # 1️⃣ Update trip fields (only provided)
            update_data = data.model_dump(
                exclude_unset=True,
                exclude={"expense_items"}
            )

            for field, value in update_data.items():
                setattr(trip, field, value)

            trip.updated_by = user_id

            # 2️⃣ Update expenses (replace strategy)
            if data.expense_items is not None:
                self.trip_expense_repo.delete_by_trip_id(trip_id)

                self.db.add_all([
                    TripExpense(
                        trip_id=trip_id,
                        expense_id=item["expense_id"],
                        amount=item["amount"],
                        notes=item.get("notes"),
                        created_by=user_id
                    )
                    for item in data.expense_items
                ])

            # 3️⃣ Commit everything
            self.db.commit()
            self.db.refresh(trip)

            return trip

        except Exception:
            self.db.rollback()
            raise




