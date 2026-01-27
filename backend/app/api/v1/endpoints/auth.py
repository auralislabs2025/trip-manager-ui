from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import TokenResponse, LoginRequest
from app.services.user_service import authenticate_user
from app.core.security import create_access_token
from app.api.deps import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db=Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id))
    return {"access_token": token, "token_type": "bearer"}
