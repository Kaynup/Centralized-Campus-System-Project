import pytest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection

class TestWalletIntegration:
    """Integration tests for wallet endpoints"""
    
    def test_get_wallet_balance(self, client, setup_database, create_test_student):
        """Test getting wallet balance"""
        student_id = create_test_student["user_id"]
        
        # Add some balance
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 1000.00 WHERE user_id = %s",
            (student_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        # Get wallet
        response = client.get(f"/wallet/balance/{student_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == create_test_student["login_id"]
        assert float(data["token_balance"]) == 1000.00
        assert float(data["reserved_tokens"]) == 0.00
    
    def test_get_wallet_nonexistent_student(self, client, setup_database):
        """Test getting wallet for non-existent student fails"""
        response = client.get(f"/wallet/balance/{str(uuid.uuid4())}")
        
        assert response.status_code == 404
    
    def test_get_transaction_history(self, client, setup_database, create_test_student):
        """Test getting transaction history"""
        student_id = create_test_student["user_id"]
        
        # Create a test transaction
        conn = get_connection()
        cursor = conn.cursor()
        transaction_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO transactions 
            (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (transaction_id, student_id, "manual_adjustment", "test", "token_topup", 100.00, 100.00))
        conn.commit()
        cursor.close()
        conn.close()
        
        # Get transactions
        response = client.get(f"/wallet/transactions/{student_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert len(data["transactions"]) > 0
    
    def test_wallet_reserved_tokens_tracking(self, client, setup_database, create_test_student):
        """Test that reserved tokens are properly tracked"""
        student_id = create_test_student["user_id"]
        
        # Set balance
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 500.00, reserved_tokens = 50.00 WHERE user_id = %s",
            (student_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        response = client.get(f"/wallet/balance/{student_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert float(data["reserved_tokens"]) == 50.00
        assert float(data["token_balance"]) == 500.00
        assert float(data["total"]) == 550.00

class TestRentalIntegration:
    """Integration tests for rental operations"""
    
    def test_get_student_rentals(self, client, setup_database, create_test_student, create_test_equipment):
        """Test getting student's rental history"""
        student_id = create_test_student["user_id"]
        
        # Create a rental record
        conn = get_connection()
        cursor = conn.cursor()
        borrow_date = datetime.now()
        due_date = borrow_date + timedelta(days=7)
        
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, 50.00, "Borrowed"))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Get rentals
        response = client.get(f"/rentals/rentals/{student_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "rentals" in data
        assert len(data["rentals"]) > 0
    
    def test_get_active_rentals(self, client, setup_database, create_test_student, create_test_equipment):
        """Test getting active rentals"""
        student_id = create_test_student["user_id"]
        
        # Create an active rental
        conn = get_connection()
        cursor = conn.cursor()
        borrow_date = datetime.now()
        due_date = borrow_date + timedelta(days=7)
        
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, 50.00, "Borrowed"))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Get active rentals
        response = client.get(f"/rentals/rentals/{student_id}/active")
        
        assert response.status_code == 200
        data = response.json()
        assert "active_rentals" in data
    
    def test_return_equipment_no_late_fee(self, client, setup_database, create_test_student, create_test_equipment):
        """Test returning equipment before due date"""
        student_id = create_test_student["user_id"]
        
        # Set up wallet with balance
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 100.00, reserved_tokens = 50.00 WHERE user_id = %s",
            (student_id,)
        )
        
        # Create rental that's not overdue
        borrow_date = datetime.now() - timedelta(days=2)
        due_date = datetime.now() + timedelta(days=5)
        
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, 50.00, "Borrowed"))
        
        conn.commit()
        rental_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        # Return equipment
        response = client.post("/rentals/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["late_fee"] == 0.0
        assert float(data["refund_amount"]) == 50.00
    
    def test_return_equipment_with_late_fee(self, client, setup_database, create_test_student, create_test_equipment):
        """Test returning equipment after due date incurs late fee"""
        student_id = create_test_student["user_id"]
        
        # Set up wallet
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 100.00, reserved_tokens = 50.00 WHERE user_id = %s",
            (student_id,)
        )
        
        # Create overdue rental
        borrow_date = datetime.now() - timedelta(days=10)
        due_date = datetime.now() - timedelta(days=2)  # Overdue by 2 days
        
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, 50.00, "Late"))
        
        conn.commit()
        rental_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        # Return equipment
        response = client.post("/rentals/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["late_fee"] > 0
    
    def test_return_nonexistent_rental(self, client, setup_database, create_test_student):
        """Test returning non-existent rental fails"""
        response = client.post("/rentals/return", json={
            "student_id": create_test_student["user_id"],
            "rental_id": 99999
        })
        
        assert response.status_code == 404
    
    def test_equipment_availability_restored_after_return(self, client, setup_database, create_test_student, create_test_equipment):
        """Test that equipment availability is restored after return"""
        student_id = create_test_student["user_id"]
        
        # Set up
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 100.00, reserved_tokens = 50.00 WHERE user_id = %s",
            (student_id,)
        )
        
        # Get initial availability
        cursor.execute(
            "SELECT available_quantity FROM equipments WHERE id = %s",
            (create_test_equipment["id"],)
        )
        initial_available = cursor.fetchone()[0]
        
        # Create rental
        borrow_date = datetime.now() - timedelta(days=2)
        due_date = datetime.now() + timedelta(days=5)
        
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, 50.00, "Borrowed"))
        
        conn.commit()
        rental_id = cursor.lastrowid
        
        # Check availability after checkout (should be reduced)
        cursor.execute(
            "SELECT available_quantity FROM equipments WHERE id = %s",
            (create_test_equipment["id"],)
        )
        after_checkout = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        assert after_checkout == initial_available - 1
        
        # Return equipment
        client.post("/rentals/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        })
        
        # Verify availability is restored
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT available_quantity FROM equipments WHERE id = %s",
            (create_test_equipment["id"],)
        )
        after_return = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        assert after_return == initial_available
