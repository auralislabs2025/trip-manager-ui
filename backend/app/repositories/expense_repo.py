from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate
from fastapi import HTTPException
from sqlalchemy import or_, func, String
from typing import Optional
import logging
import uuid

logger = logging.getLogger(__name__)


def _generate_expense_code() -> str:
    return f"EXP-{uuid.uuid4().hex[:8].upper()}"


def get_expense_by_id(db, expense_id: str):
    return db.query(Expense).filter(Expense.id == expense_id).first()


def get_expenses(db, search: Optional[str] = None):
    query = db.query(Expense).filter(Expense.is_active == True)
    search_value = (search or "").strip().lower()
    if search_value:
        query = query.filter(
            or_(
                func.lower(Expense.name).contains(search_value),
                func.lower(Expense.expense_code).contains(search_value),
                func.lower(func.cast(Expense.details, String)).contains(search_value),
            )
        )
    return query.all()


def create_expense(db, expense: ExpenseCreate):
    data = expense.model_dump()
    data["expense_code"] = _generate_expense_code()
    expense_obj = Expense(**data)
    db.add(expense_obj)
    db.commit()
    db.refresh(expense_obj)
    return expense_obj


def get_expense(db, expense_id: str):
    return db.query(Expense).filter(Expense.id == expense_id).first()


def delete_expense(db, expense_id: str):
    expense = get_expense(db, expense_id)

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Soft delete
    expense.is_active = False
    db.commit()

    return {"message": "Expense deactivated successfully"}


def update_expense(db, expense_id: str, data):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Update only provided fields (no expense_code changes)
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("expense_code", None)

    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    return expense

