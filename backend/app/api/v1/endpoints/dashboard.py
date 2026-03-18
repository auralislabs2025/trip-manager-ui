from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, get_current_user
from app.models.trip import Trip

router = APIRouter()


def _month_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def _year_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(year=start.year + 1)
    return start, end


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    now = datetime.utcnow()
    month_start, month_end = _month_bounds(now)
    year_start, year_end = _year_bounds(now)

    monthly_totals = (
        db.query(
            func.coalesce(func.sum(Trip.profit), 0.0),
            func.coalesce(func.sum(Trip.total_expenses), 0.0),
        )
        .filter(Trip.is_active == True)
        .filter(Trip.status == "closed")
        .filter(Trip.updated_at >= month_start)
        .filter(Trip.updated_at < month_end)
        .first()
    )

    yearly_profit = (
        db.query(func.coalesce(func.sum(Trip.profit), 0.0))
        .filter(Trip.is_active == True)
        .filter(Trip.status == "closed")
        .filter(Trip.updated_at >= year_start)
        .filter(Trip.updated_at < year_end)
        .scalar()
    )

    return {
        "monthly_profit": float(monthly_totals[0] or 0.0),
        "monthly_expenses": float(monthly_totals[1] or 0.0),
        "yearly_profit": float(yearly_profit or 0.0),
    }


@router.get("/monthly-profit-trend")
def get_monthly_profit_trend(db: Session = Depends(get_db), months: int = 12, user_id: str = Depends(get_current_user)):
    now = datetime.utcnow()
    months = max(1, min(months, 24))

    trend = []
    current = _month_start(now)
    for _ in range(months):
        month_start = current
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        profit = (
            db.query(func.coalesce(func.sum(Trip.profit), 0.0))
            .filter(Trip.is_active == True)
            .filter(Trip.status == "closed")
            .filter(Trip.updated_at >= month_start)
            .filter(Trip.updated_at < month_end)
            .scalar()
        )

        label = month_start.strftime("%b %Y")
        trend.append({"label": label, "profit": float(profit or 0.0)})

        if month_start.month == 1:
            current = month_start.replace(year=month_start.year - 1, month=12)
        else:
            current = month_start.replace(month=month_start.month - 1)

    trend.reverse()
    return {"items": trend}
