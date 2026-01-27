from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
     
class UserMeResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    role: str
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True
 