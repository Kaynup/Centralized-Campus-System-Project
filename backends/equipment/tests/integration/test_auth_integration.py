import pytest
import sys
import os
import uuid
import hashlib
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection

class TestAuthIntegration:
    """Integration tests for authentication endpoints"""
    
    def test_student_registration(self, client, setup_database):
        """Test student registration endpoint"""
        response = client.post("/auth/register", json={
            "login_id": f"student_{uuid.uuid4().hex[:8]}",
            "full_name": "Test Student",
            "email": f"test_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "test_password_123"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert "user_id" in data
        assert "message" in data
        assert data["message"] == "Registration successful"
    
    def test_student_registration_duplicate_login(self, client, create_test_student):
        """Test registration with duplicate login_id fails"""
        login_id = f"student_{uuid.uuid4().hex[:8]}"
        
        # Create first student
        response1 = client.post("/auth/register", json={
            "login_id": login_id,
            "full_name": "Student One",
            "email": f"student1_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "password_123"
        })
        assert response1.status_code == 201
        
        # Try to create second student with same login_id
        response2 = client.post("/auth/register", json={
            "login_id": login_id,
            "full_name": "Student Two",
            "email": f"student2_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "password_123"
        })
        assert response2.status_code == 400
    
    def test_student_login(self, client, setup_database):
        """Test student login endpoint"""
        # First register a student
        login_id = f"student_{uuid.uuid4().hex[:8]}"
        password = "test_password_123"
        email = f"test_{uuid.uuid4().hex[:8]}@campus.edu"
        
        register_response = client.post("/auth/register", json={
            "login_id": login_id,
            "full_name": "Test Student",
            "email": email,
            "password": password
        })
        assert register_response.status_code == 201
        
        # Now login
        login_response = client.post("/auth/login", json={
            "login_id": login_id,
            "password": password
        })
        
        assert login_response.status_code == 200
        data = login_response.json()
        assert "user_id" in data
        assert "login_id" in data
        assert "token_balance" in data
        assert "reserved_tokens" in data
    
    def test_student_login_invalid_password(self, client, setup_database):
        """Test login with incorrect password fails"""
        login_id = f"student_{uuid.uuid4().hex[:8]}"
        password = "correct_password_123"
        
        # Register student
        client.post("/auth/register", json={
            "login_id": login_id,
            "full_name": "Test Student",
            "email": f"test_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": password
        })
        
        # Try login with wrong password
        response = client.post("/auth/login", json={
            "login_id": login_id,
            "password": "wrong_password"
        })
        
        assert response.status_code == 401
    
    def test_student_login_user_not_found(self, client, setup_database):
        """Test login with non-existent user fails"""
        response = client.post("/auth/login", json={
            "login_id": "nonexistent_user",
            "password": "password_123"
        })
        
        assert response.status_code == 401
    
    def test_forgot_password(self, client, setup_database):
        """Test forgot password endpoint"""
        login_id = f"student_{uuid.uuid4().hex[:8]}"
        password = "old_password_123"
        
        # Register student
        client.post("/auth/register", json={
            "login_id": login_id,
            "full_name": "Test Student",
            "email": f"test_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": password
        })
        
        # Reset password
        response = client.post("/auth/forgot-password", json={
            "login_id": login_id,
            "new_password": "new_password_123"
        })
        
        assert response.status_code == 200
        
        # Try login with new password
        login_response = client.post("/auth/login", json={
            "login_id": login_id,
            "password": "new_password_123"
        })
        
        assert login_response.status_code == 200
    
    def test_forgot_password_user_not_found(self, client, setup_database):
        """Test forgot password for non-existent user fails"""
        response = client.post("/auth/forgot-password", json={
            "login_id": "nonexistent_user",
            "new_password": "new_password_123"
        })
        
        assert response.status_code == 404
    
    def test_wallet_created_on_registration(self, client, setup_database):
        """Test that wallet is automatically created on registration"""
        login_id = f"student_{uuid.uuid4().hex[:8]}"
        
        response = client.post("/auth/register", json={
            "login_id": login_id,
            "full_name": "Test Student",
            "email": f"test_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "password_123"
        })
        
        assert response.status_code == 201
        user_id = response.json()["user_id"]
        
        # Verify wallet exists in database
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM wallets WHERE user_id = %s", (user_id,))
        wallet = cursor.fetchone()
        cursor.close()
        conn.close()
        
        assert wallet is not None
        assert wallet["token_balance"] == 0.00
        assert wallet["reserved_tokens"] == 0.00
