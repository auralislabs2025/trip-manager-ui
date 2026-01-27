from app.models.user import User

def get_user_by_username(db, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db, user_id: str):
    return db.query(User).filter(User.id == user_id).first()
