import os
import sys
import mysql.connector

# Add local path to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "campus_central_db")

def init_db():
    print(f"Connecting to MySQL server at {DB_HOST}...")
    # 1. Create Database if not exists
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    print(f"Database '{DB_NAME}' created or already exists.")
    cursor.close()
    conn.close()

    # 2. Run SQLAlchemy create_all to initialize centralized core tables
    print("Running SQLAlchemy Base.metadata.create_all...")
    from database import Base, engine
    import models  # Register models on Base
    Base.metadata.create_all(engine)
    print("Database tables initialized successfully.")

    # 3. Seed default mock users for frontend manual verification
    print("Seeding default student accounts...")
    from database import SessionLocal
    from auth_utils import get_password_hash
    
    db = SessionLocal()
    try:
        hashed_pwd = get_password_hash("password123")
        
        # Student 1: student1 / password123
        student1 = db.query(models.User).filter(models.User.login_id == "student1").first()
        if not student1:
            s1 = models.User(
                id="test-student1-uuid-1111-2222-333333",
                login_id="student1",
                full_name="Student A",
                email="student_a@mail.com",
                password_hash=hashed_pwd,
                role=models.UserRole.student,
                is_active=True,
                is_verified=True
            )
            db.add(s1)
            db.flush()
            db.add(models.Wallet(
                user_id=s1.id,
                token_balance=500.00,
                reserved_tokens=0.00
            ))
            print("Seeded student1 / password123 with 500.00 tokens.")
            
        # Student 2: student2 / password123
        student2 = db.query(models.User).filter(models.User.login_id == "student2").first()
        if not student2:
            s2 = models.User(
                id="test-student2-uuid-1111-2222-333333",
                login_id="student2",
                full_name="Student B",
                email="student_b@mail.com",
                password_hash=hashed_pwd,
                role=models.UserRole.student,
                is_active=True,
                is_verified=True
            )
            db.add(s2)
            db.flush()
            db.add(models.Wallet(
                user_id=s2.id,
                token_balance=500.00,
                reserved_tokens=0.00
            ))
            print("Seeded student2 / password123 with 500.00 tokens.")
            
        db.commit()
    except Exception as e:
        print(f"Error seeding default users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
