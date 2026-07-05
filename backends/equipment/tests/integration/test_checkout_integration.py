import pytest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection

class TestInventoryIntegration:
    """Integration tests for inventory endpoints"""
    
    def test_list_available_equipment(self, client, setup_database, create_test_equipment):
        """Test listing available equipment"""
        response = client.get("/inventory/list")
        
        assert response.status_code == 200
        data = response.json()
        assert "equipments" in data
        assert len(data["equipments"]) > 0
    
    def test_get_equipment_by_category(self, client, setup_database):
        """Test filtering equipment by category"""
        # Create equipment
        client.post("/admin/add-equipment", json={
            "name": "Laptop",
            "description": "Dell Laptop",
            "category": "Electronics",
            "deposit_amount": 50.00,
            "quantity": 5
        })
        
        response = client.get("/inventory/list?category=Electronics")
        
        assert response.status_code == 200
        data = response.json()
        assert "equipments" in data
    
    def test_search_equipment(self, client, setup_database):
        """Test searching equipment by name"""
        # Create equipment
        client.post("/admin/add-equipment", json={
            "name": "Projector XYZ",
            "description": "High-end Projector",
            "category": "AV Equipment",
            "deposit_amount": 100.00,
            "quantity": 2
        })
        
        response = client.get("/inventory/list?search=Projector")
        
        assert response.status_code == 200

class TestCheckoutIntegration:
    """Integration tests for checkout endpoints"""
    
    def test_successful_checkout(self, client, setup_database, create_test_student, create_test_equipment):
        """Test successful equipment checkout"""
        # Register student with initial balance
        conn = get_connection()
        cursor = conn.cursor()
        
        # Add balance to student
        student_id = create_test_student["user_id"]
        cursor.execute(
            "UPDATE wallets SET token_balance = 500.00 WHERE user_id = %s",
            (student_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        # Checkout equipment
        response = client.post("/checkout/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"],
            "rental_duration_days": 7
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "due_date" in data
        assert "deposit_locked" in data
    
    def test_checkout_insufficient_balance(self, client, setup_database, create_test_student, create_test_equipment):
        """Test checkout fails with insufficient balance"""
        student_id = create_test_student["user_id"]
        
        # Set balance to 0
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 0.00 WHERE user_id = %s",
            (student_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        # Try to checkout
        response = client.post("/checkout/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"],
            "rental_duration_days": 7
        })
        
        assert response.status_code == 400
    
    def test_checkout_out_of_stock(self, client, setup_database, create_test_student, create_test_equipment):
        """Test checkout fails when equipment is out of stock"""
        # Set available quantity to 0
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE equipments SET available_quantity = 0 WHERE id = %s",
            (create_test_equipment["id"],)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        # Try to checkout
        response = client.post("/checkout/checkout", json={
            "student_id": create_test_student["user_id"],
            "equipment_id": create_test_equipment["id"],
            "rental_duration_days": 7
        })
        
        assert response.status_code == 400
    
    def test_checkout_nonexistent_equipment(self, client, setup_database, create_test_student):
        """Test checkout with non-existent equipment fails"""
        response = client.post("/checkout/checkout", json={
            "student_id": create_test_student["user_id"],
            "equipment_id": 99999,
            "rental_duration_days": 7
        })
        
        assert response.status_code == 404
    
    def test_checkout_nonexistent_student(self, client, setup_database, create_test_equipment):
        """Test checkout with non-existent student fails"""
        response = client.post("/checkout/checkout", json={
            "student_id": str(uuid.uuid4()),
            "equipment_id": create_test_equipment["id"],
            "rental_duration_days": 7
        })
        
        assert response.status_code == 404
    
    def test_checkout_tokens_reserved(self, client, setup_database, create_test_student, create_test_equipment):
        """Test that deposit tokens are reserved after checkout"""
        student_id = create_test_student["user_id"]
        
        # Add balance
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 500.00 WHERE user_id = %s",
            (student_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        # Checkout
        response = client.post("/checkout/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"],
            "rental_duration_days": 7
        })
        
        assert response.status_code == 200
        
        # Verify reserved tokens
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT reserved_tokens FROM wallets WHERE user_id = %s",
            (student_id,)
        )
        wallet = cursor.fetchone()
        cursor.close()
        conn.close()
        
        assert wallet["reserved_tokens"] > 0
