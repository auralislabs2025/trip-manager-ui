from app.core.security import verify_password
from app.repositories.user_repo import get_user_by_email

def authenticate_user(db, email: str, password: str):
    user = get_user_by_email(db, email)

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    return user
