import pytest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection

class TestAdminIntegration:
    """Integration tests for admin endpoints"""
    
    def test_admin_login(self, client, setup_database, create_test_admin):
        """Test admin login"""
        # First create admin in DB with password hash
        admin_id = f"admin_{uuid.uuid4().hex[:8]}"
        password = "admin_password_123"
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Create admin user
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO admin_users (id, admin_id, name, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, (str(uuid.uuid4()), admin_id, "Test Admin", 
              f"admin_{uuid.uuid4().hex[:8]}@campus.edu", password_hash, "moderator"))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Login
        response = client.post("/admin/login", json={
            "admin_id": admin_id,
            "password": password
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "admin_id" in data
        assert data["admin_id"] == admin_id
    
    def test_admin_login_invalid_password(self, client, setup_database):
        """Test admin login with wrong password fails"""
        admin_id = f"admin_{uuid.uuid4().hex[:8]}"
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO admin_users (id, admin_id, name, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, (str(uuid.uuid4()), admin_id, "Test Admin", 
              f"admin_{uuid.uuid4().hex[:8]}@campus.edu", "hash", "moderator"))
        conn.commit()
        cursor.close()
        conn.close()
        
        response = client.post("/admin/login", json={
            "admin_id": admin_id,
            "password": "wrong_password"
        })
        
        assert response.status_code == 401
    
    def test_add_student_by_admin(self, client, setup_database):
        """Test admin adding a student"""
        login_id = f"student_{uuid.uuid4().hex[:8]}"
        
        response = client.post("/admin/add-student", json={
            "login_id": login_id,
            "full_name": "New Student",
            "email": f"newstudent_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "student_password"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert "user_id" in data
        assert "login_id" in data
        assert data["login_id"] == login_id
    
    def test_add_equipment_by_admin(self, client, setup_database):
        """Test admin adding equipment"""
        response = client.post("/admin/add-equipment", json={
            "name": "Projector",
            "description": "High-quality projector",
            "category": "AV Equipment",
            "deposit_amount": 100.00,
            "quantity": 3
        })
        
        assert response.status_code == 201
        data = response.json()
        assert "equipment_id" in data
        assert "name" in data
        assert data["name"] == "Projector"
    
    def test_get_all_students(self, client, setup_database):
        """Test getting list of all students"""
        # Add a few students
        for i in range(3):
            client.post("/admin/add-student", json={
                "login_id": f"student_{uuid.uuid4().hex[:8]}",
                "full_name": f"Student {i}",
                "email": f"student{i}_{uuid.uuid4().hex[:8]}@campus.edu",
                "password": "password"
            })
        
        response = client.get("/admin/students")
        
        assert response.status_code == 200
        data = response.json()
        assert "students" in data
        assert len(data["students"]) >= 3
    
    def test_get_dashboard_stats(self, client, setup_database):
        """Test getting dashboard statistics"""
        response = client.get("/admin/dashboard-stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        assert "total_equipment" in data
        assert "active_rentals" in data
        assert "late_rentals" in data
        assert "total_tokens_distributed" in data
    
    def test_get_all_rentals_admin(self, client, setup_database):
        """Test admin getting all rentals"""
        response = client.get("/admin/all-rentals")
        
        assert response.status_code == 200
        data = response.json()
        assert "rentals" in data
    
    def test_get_late_rentals(self, client, setup_database, create_test_student, create_test_equipment):
        """Test getting late rentals"""
        # Create an overdue rental
        conn = get_connection()
        cursor = conn.cursor()
        
        borrow_date = datetime.now() - timedelta(days=10)
        due_date = datetime.now() - timedelta(days=2)
        
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (create_test_student["user_id"], create_test_equipment["id"], 
              borrow_date, due_date, 50.00, "Late"))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        response = client.get("/admin/late-rentals")
        
        assert response.status_code == 200
        data = response.json()
        assert "late_rentals" in data
    
    def test_add_student_balance_by_admin(self, client, setup_database, create_test_student):
        """Test admin adding balance to student wallet"""
        student_id = create_test_student["user_id"]
        
        response = client.post("/admin/add-balance", json={
            "student_id": student_id,
            "amount": 500.00
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "new_balance" in data
        assert float(data["new_balance"]) == 500.00
    
    def test_update_equipment_by_admin(self, client, setup_database):
        """Test admin updating equipment"""
        # Create equipment first
        create_response = client.post("/admin/add-equipment", json={
            "name": "Original Name",
            "description": "Original description",
            "category": "Category",
            "deposit_amount": 50.00,
            "quantity": 5
        })
        equipment_id = create_response.json()["equipment_id"]
        
        # Update equipment
        update_response = client.put(f"/admin/update-equipment/{equipment_id}", json={
            "name": "Updated Name",
            "category": "Updated Category"
        })
        
        assert update_response.status_code == 200
    
    def test_deactivate_student_by_admin(self, client, setup_database):
        """Test admin deactivating a student"""
        # Create student
        create_response = client.post("/admin/add-student", json={
            "login_id": f"student_{uuid.uuid4().hex[:8]}",
            "full_name": "Test Student",
            "email": f"test_{uuid.uuid4().hex[:8]}@campus.edu",
            "password": "password"
        })
        student_id = create_response.json()["user_id"]
        
        # Deactivate
        response = client.put(f"/admin/update-student-status/{student_id}", json={
            "is_active": False
        })
        
        assert response.status_code == 200
        
        # Verify in database
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT is_active FROM users WHERE id = %s", (student_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        assert user["is_active"] == 0
    
    def test_get_all_transactions_admin(self, client, setup_database):
        """Test admin getting all transactions"""
        response = client.get("/admin/all-transactions")
        
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
