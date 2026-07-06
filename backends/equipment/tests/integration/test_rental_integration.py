import pytest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection


class TestWalletIntegration:
    """Integration tests for GET /wallet/{student_id} and /wallet/{student_id}/transactions."""

    def test_get_wallet_balance(self, client, setup_database, create_test_student):
        """GET /wallet/{student_id} returns correct balance keys."""
        student_id = create_test_student["user_id"]

        # Set a known balance
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = 1000.00, reserved_tokens = 50.00 WHERE user_id = %s",
            (student_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()

        resp = client.get(f"/wallet/{student_id}")
        assert resp.status_code == 200
        data = resp.json()
        # Actual keys: student_id, available_balance, reserved_balance, total_balance
        assert "student_id" in data
        assert float(data["available_balance"]) == 1000.00
        assert float(data["reserved_balance"]) == 50.00
        assert float(data["total_balance"]) == 1050.00

    def test_get_wallet_nonexistent_student_returns_404(self, client, setup_database):
        """GET /wallet/{student_id} with unknown ID returns 404."""
        resp = client.get(f"/wallet/{str(uuid.uuid4())}")
        assert resp.status_code == 404

    def test_get_transaction_history(self, client, setup_database, create_test_student):
        """GET /wallet/{student_id}/transactions returns the list of transactions."""
        student_id = create_test_student["user_id"]

        # Insert a mock transaction
        conn = get_connection()
        cursor = conn.cursor()
        tx_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO transactions
            (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (tx_id, student_id, "manual_adjustment", "test", "token_topup", 100.00, 100.00))
        conn.commit()
        cursor.close()
        conn.close()

        resp = client.get(f"/wallet/{student_id}/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert "transactions" in data
        assert len(data["transactions"]) > 0

    def test_transaction_history_empty_for_new_student(self, client, setup_database, create_test_student):
        """A freshly created student has no transactions."""
        student_id = create_test_student["user_id"]

        resp = client.get(f"/wallet/{student_id}/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["transactions"] == []


class TestRentalIntegration:
    """Integration tests for rental list, active rental, and return endpoints."""

    def _insert_rental(self, student_id: str, equipment_id: int, status: str = "Borrowed",
                       days_borrowed: int = 2, days_until_due: int = 5,
                       deposit: float = 50.00) -> int:
        """Helper: directly insert a rental record and return its id."""
        borrow_date = datetime.now() - timedelta(days=days_borrowed)
        due_date = datetime.now() + timedelta(days=days_until_due)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (student_id, equipment_id, borrow_date, due_date, deposit, status))
        conn.commit()
        rental_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return rental_id

    def _set_wallet(self, student_id: str, balance: float, reserved: float = 0.00):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = %s, reserved_tokens = %s WHERE user_id = %s",
            (balance, reserved, student_id)
        )
        conn.commit()
        cursor.close()
        conn.close()

    # ------------------------------------------------------------------
    # Rental history
    # ------------------------------------------------------------------

    def test_get_student_rentals(self, client, setup_database, create_test_student, create_test_equipment):
        """GET /rentals/{student_id} lists rental history for the student."""
        student_id = create_test_student["user_id"]
        self._insert_rental(student_id, create_test_equipment["id"])

        resp = client.get(f"/rentals/{student_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "rentals" in data
        assert len(data["rentals"]) > 0

    def test_get_active_rentals(self, client, setup_database, create_test_student, create_test_equipment):
        """GET /rentals/{student_id}/active returns only Borrowed/Late rentals."""
        student_id = create_test_student["user_id"]
        self._insert_rental(student_id, create_test_equipment["id"], status="Borrowed")

        resp = client.get(f"/rentals/{student_id}/active")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_rentals" in data
        assert any(r["status"] in ("Borrowed", "Late") for r in data["active_rentals"])

    def test_returned_rental_not_in_active(self, client, setup_database, create_test_student, create_test_equipment):
        """Returned rentals do not appear in active rentals list."""
        student_id = create_test_student["user_id"]
        # Insert an already-returned rental
        borrow_date = datetime.now() - timedelta(days=10)
        due_date = datetime.now() - timedelta(days=3)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status, return_date)
            VALUES (%s, %s, %s, %s, 50.00, 'Returned', %s)
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, datetime.now()))
        conn.commit()
        cursor.close()
        conn.close()

        resp = client.get(f"/rentals/{student_id}/active")
        assert resp.status_code == 200
        data = resp.json()
        statuses = [r["status"] for r in data["active_rentals"]]
        assert "Returned" not in statuses

    # ------------------------------------------------------------------
    # Return
    # ------------------------------------------------------------------

    def test_return_on_time_no_late_fee(self, client, setup_database, create_test_student, create_test_equipment):
        """POST /return before due date refunds full deposit with no late fee."""
        student_id = create_test_student["user_id"]
        deposit = 50.00
        self._set_wallet(student_id, 100.00, deposit)
        rental_id = self._insert_rental(student_id, create_test_equipment["id"],
                                        days_borrowed=2, days_until_due=5, deposit=deposit)

        resp = client.post("/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["late_fee"] == 0.0
        assert float(data["refund_amount"]) == deposit

    def test_return_overdue_charges_late_fee(self, client, setup_database, create_test_student, create_test_equipment):
        """POST /return after due date incurs a positive late fee."""
        student_id = create_test_student["user_id"]
        deposit = 50.00
        self._set_wallet(student_id, 100.00, deposit)

        # Create rental that is 3 days overdue
        borrow_date = datetime.now() - timedelta(days=10)
        due_date = datetime.now() - timedelta(days=3)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO rental_records
            (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, 'Late')
        """, (student_id, create_test_equipment["id"], borrow_date, due_date, deposit))
        conn.commit()
        rental_id = cursor.lastrowid
        cursor.close()
        conn.close()

        resp = client.post("/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["late_fee"] > 0
        assert float(data["refund_amount"]) < deposit

    def test_return_restores_equipment_availability(self, client, setup_database, create_test_student, create_test_equipment):
        """After return, equipment available_quantity is incremented by 1."""
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        deposit = 50.00
        self._set_wallet(student_id, 100.00, deposit)

        # Decrement available_quantity (simulate prior checkout)
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT available_quantity FROM equipments WHERE id = %s", (eq_id,))
        before_qty = cursor.fetchone()["available_quantity"]
        cursor.execute("UPDATE equipments SET available_quantity = available_quantity - 1 WHERE id = %s", (eq_id,))
        conn.commit()
        cursor.close()
        conn.close()

        rental_id = self._insert_rental(student_id, eq_id, deposit=deposit)

        client.post("/return", json={"student_id": student_id, "rental_id": rental_id})

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT available_quantity FROM equipments WHERE id = %s", (eq_id,))
        after_qty = cursor.fetchone()["available_quantity"]
        cursor.close()
        conn.close()

        assert after_qty == before_qty

    def test_return_nonexistent_rental_returns_404(self, client, setup_database, create_test_student):
        """POST /return with a non-existent rental_id returns 404."""
        resp = client.post("/return", json={
            "student_id": create_test_student["user_id"],
            "rental_id": 99999
        })
        assert resp.status_code == 404

    def test_return_writes_transaction_records(self, client, setup_database, create_test_student, create_test_equipment):
        """After a successful return, a deposit_unlock transaction is written."""
        student_id = create_test_student["user_id"]
        deposit = 50.00
        self._set_wallet(student_id, 100.00, deposit)
        rental_id = self._insert_rental(student_id, create_test_equipment["id"], deposit=deposit)

        client.post("/return", json={"student_id": student_id, "rental_id": rental_id})

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM transactions WHERE user_id = %s AND transaction_type = 'deposit_unlock'",
            (student_id,)
        )
        tx = cursor.fetchone()
        cursor.close()
        conn.close()

        assert tx is not None
