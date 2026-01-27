from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from passlib.context import CryptContext
from datetime import datetime



def run():
    db = SessionLocal()

    user = User(
        username="admin",
        email="admin@admin.com",
        password_hash=hash_password("truckAdmin@2026"),
        role="admin",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        last_login=datetime.now()
    )

    db.add(user)
    db.commit()
    db.close()

    print("User seeded successfully")

if __name__ == "__main__":
    run()
