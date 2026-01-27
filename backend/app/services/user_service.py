from app.core.security import verify_password
from app.repositories.user_repo import get_user_by_username

def authenticate_user(db, username: str, password: str):
    user = get_user_by_username(db, username)

    if not user:
        return None

    # ✅ FIX IS HERE
    if not verify_password(password, user.password_hash):
        return None

    return user
