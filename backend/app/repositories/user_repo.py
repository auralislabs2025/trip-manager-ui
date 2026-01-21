from app.models.user import User

def get_user_by_email(db, email: str):
    return db.query(User).filter(User.email == email).first()
