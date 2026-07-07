import pytest
import os, sys, uuid
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import engine

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

    cursor = db_conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'hash', 'student', TRUE, TRUE, NOW(), NOW())
        """,
        (user_id, f"user_{run_id}", "Test User", f"user_{run_id}@test.com")
    )
    db_conn.commit()
    cursor.close()

    yield {"id": user_id, "role": "student", "is_active": True}

    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    db_conn.commit()
    cursor.close()


def mock_get_current_user(user_data):
    def dependency():
        return user_data
    return dependency
