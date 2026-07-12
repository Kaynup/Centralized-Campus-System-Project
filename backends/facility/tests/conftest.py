import pytest
import os
import uuid
import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from jose import jwt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import engine

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkeycampuscore123!")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(scope="function")
def db_conn():
    conn = engine.raw_connection()
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture(scope="function")
def test_user(db_conn):
    run_id = str(uuid.uuid4())[:8]
    user_id = f"user_{run_id}"
    wallet_id = str(uuid.uuid4())

    cursor = db_conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'hash', 'student', TRUE, TRUE, NOW(), NOW())
        """,
        (user_id, f"user_{run_id}", "Test User", f"user_{run_id}@test.com")
    )
    cursor.execute(
        """
        INSERT INTO wallets (id, user_id, token_balance, reserved_tokens, facility_tokens_used, rental_tokens_used, created_at, updated_at)
        VALUES (%s, %s, 500.00, 0.00, 0.00, 0.00, NOW(), NOW())
        """,
        (wallet_id, user_id)
    )
    db_conn.commit()
    cursor.close()

    yield {"id": user_id, "role": "student", "is_active": True}

    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM wallets WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    db_conn.commit()
    cursor.close()


@pytest.fixture(scope="function")
def auth_headers(test_user):
    """Generate a valid JWT for test_user simulating the Core service token format."""
    payload = {
        "sub": test_user["id"],
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def test_admin(db_conn):
    """Create a test admin in admin_users table."""
    run_id = str(uuid.uuid4())[:8]
    admin_id = f"admin_{run_id}"

    cursor = db_conn.cursor()
    cursor.execute(
        """
        INSERT INTO admin_users (id, admin_id, name, email, password_hash, role, is_active, created_at)
        VALUES (%s, %s, %s, %s, 'hash', 'super_admin', TRUE, NOW())
        """,
        (admin_id, f"admin_{run_id}", "Test Admin", f"admin_{run_id}@test.com")
    )
    db_conn.commit()
    cursor.close()

    yield {"id": admin_id, "role": "admin", "is_active": True}

    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM admin_users WHERE id = %s", (admin_id,))
    db_conn.commit()
    cursor.close()


@pytest.fixture(scope="function")
def admin_headers(test_admin):
    """Generate a valid JWT for a test admin user."""
    payload = {
        "sub": test_admin["id"],
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def mock_get_current_user(user_data):
    def dependency():
        return user_data
    return dependency
