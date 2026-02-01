from fastapi import APIRouter, Depends
from typing import Optional
from app.api.deps import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
import logging
logger = logging.getLogger(__name__)
from app.repositories.expense_repo import (
    get_expenses,
    create_expense,
    get_expense,
    delete_expense,
    update_expense,
)

router = APIRouter()


@router.get("/", response_model=list[ExpenseResponse])
def get_all_expenses(
    search: Optional[str] = None,
    db = Depends(get_db)
):
    logger.info("get all expenses")
    expenses = get_expenses(db, search=search)
    return expenses


@router.post("/", response_model=ExpenseResponse)
def create_expense_endpoint(
    expense: ExpenseCreate,
    db = Depends(get_db)
):
    new_expense = create_expense(db, expense)
    return new_expense


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense_by_id(
    expense_id: str,
    db = Depends(get_db)
):
    expense = get_expense(db, expense_id)
    return expense


@router.delete("/{expense_id}")
def delete_expense_by_id(
    expense_id: str,
    db = Depends(get_db)
):
   return delete_expense(db, expense_id)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense_by_id(
    expense_id: str,
    expense: ExpenseUpdate,
    db = Depends(get_db)
):
    updated_expense = update_expense(db, expense_id, expense)
    return updated_expense

