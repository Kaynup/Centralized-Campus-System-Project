import pytest
import os
import uuid
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from db import get_db_connection

# In marketplace, we use db.py which gives a raw connection. 
# We'll use the same database for tests.

@pytest.fixture(scope="session")
def client():
    return TestClient(app)

@pytest.fixture(scope="function")
def db_conn():
    with get_db_connection() as conn:
        yield conn

@pytest.fixture(scope="function")
def test_buyer(db_conn):
    run_id = str(uuid.uuid4())[:8]
    buyer_id = f"buyer_{run_id}"
    
    cursor = db_conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'hash', 'student', TRUE, TRUE, NOW(), NOW())
        """,
        (buyer_id, f"buyer_{run_id}", "Test Buyer", f"buyer_{run_id}@test.com")
    )
    cursor.execute(
        """
        INSERT INTO wallets (id, user_id, token_balance, reserved_tokens, facility_tokens_used, rental_tokens_used, created_at, updated_at)
        VALUES (%s, %s, 100.00, 0.00, 0.00, 0.00, NOW(), NOW())
        """,
        (str(uuid.uuid4()), buyer_id)
    )
    db_conn.commit()
    cursor.close()
    
    yield {"id": buyer_id, "role": "student", "is_active": True}
    
    # Cleanup
    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM wallets WHERE user_id = %s", (buyer_id,))
    cursor.execute("DELETE FROM users WHERE id = %s", (buyer_id,))
    db_conn.commit()
    cursor.close()

@pytest.fixture(scope="function")
def test_seller(db_conn):
    run_id = str(uuid.uuid4())[:8]
    seller_id = f"seller_{run_id}"
    
    cursor = db_conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'hash', 'student', TRUE, TRUE, NOW(), NOW())
        """,
        (seller_id, f"seller_{run_id}", "Test Seller", f"seller_{run_id}@test.com")
    )
    cursor.execute(
        """
        INSERT INTO wallets (id, user_id, token_balance, reserved_tokens, facility_tokens_used, rental_tokens_used, created_at, updated_at)
        VALUES (%s, %s, 50.00, 0.00, 0.00, 0.00, NOW(), NOW())
        """,
        (str(uuid.uuid4()), seller_id)
    )
    db_conn.commit()
    cursor.close()
    
    yield {"id": seller_id, "role": "student", "is_active": True}
    
    # Cleanup
    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM wallets WHERE user_id = %s", (seller_id,))
    cursor.execute("DELETE FROM users WHERE id = %s", (seller_id,))
    db_conn.commit()
    cursor.close()

# Mock get_current_user dependency
from auth import get_current_user

def mock_get_current_user(user_data):
    def dependency():
        return user_data
    return dependency
