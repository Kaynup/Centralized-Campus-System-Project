import pytest
import os
import uuid
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db
import models

# Use an in-memory SQLite database for testing, or a dedicated test MySQL DB.
# For simplicity and isolation, we use SQLite in-memory here for Centralized Core unit/integration tests
# unless MySQL-specific features are heavily relied upon. Wait, the actual app uses MySQL.
# Since it integrates with other services using MySQL, it's safer to use the real MySQL DB with a test prefix or just use the same approach as equipment tests.

# Let's use the same DB as the app (MySQL), but clean it up.
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "campus_central_db")
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def client():
    return TestClient(app)

@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def test_user(db_session):
    run_id = str(uuid.uuid4())[:8]
    user = models.User(
        id=str(uuid.uuid4()),
        login_id=f"testuser_{run_id}",
        full_name="Test User",
        email=f"test_{run_id}@example.com",
        password_hash="fakehash",
        role=models.UserRole.student,
        is_active=True,
        is_verified=True
    )
    wallet = models.Wallet(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_balance=100.00,
        reserved_tokens=0.00,
        facility_tokens_used=0.00,
        rental_tokens_used=0.00
    )
    db_session.add(user)
    db_session.add(wallet)
    db_session.commit()
    db_session.refresh(user)
    
    yield user
    
    # Teardown
    db_session.query(models.Notification).filter(models.Notification.recipient_id == user.id).delete()
    db_session.query(models.Transaction).filter(models.Transaction.user_id == user.id).delete()
    db_session.query(models.Wallet).filter(models.Wallet.user_id == user.id).delete()
    db_session.query(models.User).filter(models.User.id == user.id).delete()
    db_session.commit()
