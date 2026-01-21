from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.schemas.user import UserMeResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserMeResponse)
def read_me(current_user=Depends(get_current_user)):
    return {"user_id": current_user}
