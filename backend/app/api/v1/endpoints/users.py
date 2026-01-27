from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user, get_db
from app.schemas.user import UserMeResponse
from app.repositories.user_repo import get_user_by_id

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserMeResponse)
def read_me(
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user