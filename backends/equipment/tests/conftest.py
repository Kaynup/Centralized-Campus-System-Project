import pytest
import os
import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
from jose import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkeycampuscore123!")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from main import app
except ImportError:
    # For unit tests that don't need the app
    app = None

from database import get_connection

# Test database credentials
TEST_DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "root"),
    "database": os.getenv("DB_NAME", "campus_central_db")
}

@pytest.fixture(scope="session")
def client():
    """Create test client for FastAPI app"""
    if app is None:
        return None
    return TestClient(app)

@pytest.fixture
def test_user_id():
    """Generate a test user UUID"""
    return str(uuid.uuid4())

@pytest.fixture
def test_equipment_id():
    """Generate a test equipment ID"""
    return 1

@pytest.fixture
def setup_database():
    """Set up test database by creating tables if they don't exist"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                login_id VARCHAR(50) NOT NULL UNIQUE,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'student',
                is_active BOOLEAN DEFAULT TRUE,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wallets (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL UNIQUE,
                token_balance DECIMAL(12, 2) DEFAULT 0.00,
                reserved_tokens DECIMAL(12, 2) DEFAULT 0.00,
                facility_tokens_used DECIMAL(12, 2) DEFAULT 0.00,
                rental_tokens_used DECIMAL(12, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_users (
                id VARCHAR(36) PRIMARY KEY,
                admin_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'moderator',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS equipments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                deposit_amount DECIMAL(10, 2) NOT NULL,
                quantity INT DEFAULT 1,
                available_quantity INT DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rental_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(36) NOT NULL,
                equipment_id INT NOT NULL,
                borrow_date DATETIME NOT NULL,
                due_date DATETIME NOT NULL,
                return_date DATETIME,
                deposit_amount DECIMAL(10, 2) NOT NULL,
                status ENUM('Borrowed', 'Late', 'Returned') DEFAULT 'Borrowed',
                late_fee DECIMAL(10, 2) DEFAULT 0.00,
                days_overdue INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                reference_type VARCHAR(50),
                reference_id VARCHAR(36),
                transaction_type VARCHAR(100),
                token_amount DECIMAL(12, 2),
                token_balance_after DECIMAL(12, 2),
                description VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        conn.commit()
        yield
        
    finally:
        # Clean up tables after test
        cursor.execute("SET FOREIGN_KEY_CHECKS=0")
        cursor.execute("TRUNCATE TABLE transactions")
        cursor.execute("TRUNCATE TABLE rental_records")
        cursor.execute("TRUNCATE TABLE wallets")
        cursor.execute("TRUNCATE TABLE users")
        cursor.execute("TRUNCATE TABLE equipments")
        cursor.execute("TRUNCATE TABLE admin_users")
        cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        conn.commit()
        cursor.close()
        conn.close()

@pytest.fixture
def create_test_student(setup_database):
    """Create a test student user in the database"""
    user_id = str(uuid.uuid4())
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Create user
        cursor.execute("""
            INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE, TRUE)
        """, (user_id, f"student_{uuid.uuid4().hex[:8]}", "Test Student", 
              f"test_{uuid.uuid4().hex[:8]}@campus.edu", 
              "test_password_hash", "student"))
        
        # Create wallet
        wallet_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO wallets (id, user_id, token_balance, reserved_tokens, facility_tokens_used, rental_tokens_used)
            VALUES (%s, %s, 1000.00, 0.00, 0.00, 0.00)
        """, (wallet_id, user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "user_id": user_id,
            "login_id": f"student_{uuid.uuid4().hex[:8]}",
            "password": "test_password_123"
        }
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise e

@pytest.fixture
def auth_headers(create_test_student):
    """Generate mock JWT auth headers for the test student"""
    user_id = create_test_student["user_id"]
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def create_test_equipment(setup_database):
    """Create test equipment in the database"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO equipments (name, description, category, deposit_amount, quantity, available_quantity, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, ("Laptop Dell", "Dell Inspiron 15", "Electronics", 50.00, 5, 5))
        
        conn.commit()
        equipment_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return {
            "id": equipment_id,
            "name": "Laptop Dell",
            "category": "Electronics",
            "deposit_amount": 50.00
        }
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise e

@pytest.fixture
def create_test_admin(setup_database):
    """Create a test admin user"""
    admin_id = str(uuid.uuid4())
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO admin_users (id, admin_id, name, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, (admin_id, f"admin_{uuid.uuid4().hex[:8]}", "Test Admin", 
              f"admin_{uuid.uuid4().hex[:8]}@campus.edu", 
              "admin_password_hash", "moderator"))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "admin_id": f"admin_{uuid.uuid4().hex[:8]}",
            "password": "admin_password_123"
        }
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise e
