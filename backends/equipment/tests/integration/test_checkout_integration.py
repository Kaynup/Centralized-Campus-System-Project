import pytest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection


class TestInventoryIntegration:
    """Integration tests for GET /inventory endpoints."""

    def test_list_available_equipment_returns_200(self, client, setup_database, create_test_equipment):
        """GET /inventory returns a non-empty list when equipment exists."""
        response = client.get("/inventory")
        assert response.status_code == 200
        data = response.json()
        assert "inventory" in data
        assert len(data["inventory"]) > 0

    def test_list_available_equipment_excludes_zero_stock(self, client, setup_database, create_test_equipment):
        """GET /inventory does not include equipment with available_quantity = 0."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE equipments SET available_quantity = 0 WHERE id = %s",
            (create_test_equipment["id"],)
        )
        conn.commit()
        cursor.close()
        conn.close()

        response = client.get("/inventory")
        assert response.status_code == 200
        data = response.json()
        ids = [item["id"] for item in data["inventory"]]
        assert create_test_equipment["id"] not in ids

    def test_get_single_equipment_by_id(self, client, setup_database, create_test_equipment):
        """GET /inventory/{id} returns the correct equipment record."""
        eq_id = create_test_equipment["id"]
        response = client.get(f"/inventory/{eq_id}")
        assert response.status_code == 200
        data = response.json()
        assert "equipment" in data
        assert data["equipment"]["id"] == eq_id
        assert data["equipment"]["name"] == create_test_equipment["name"]

    def test_get_nonexistent_equipment_returns_404(self, client, setup_database):
        """GET /inventory/{id} with unknown id returns 404."""
        response = client.get("/inventory/99999")
        assert response.status_code == 404


class TestCheckoutIntegration:
    """Integration tests for POST /checkout endpoint."""

    def _give_balance(self, student_id: str, amount: float = 500.00):
        """Helper: set student wallet token_balance to a fixed amount."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE wallets SET token_balance = %s WHERE user_id = %s",
            (amount, student_id)
        )
        conn.commit()
        cursor.close()
        conn.close()

    def test_successful_checkout(self, client, setup_database, create_test_student, create_test_equipment):
        """POST /checkout succeeds when student has sufficient balance."""
        student_id = create_test_student["user_id"]
        self._give_balance(student_id, 500.00)

        response = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        })

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "due_date" in data
        assert "deposit_locked" in data

    def test_checkout_reserves_deposit_in_wallet(self, client, setup_database, create_test_student, create_test_equipment):
        """After checkout, reserved_tokens increases by the deposit amount."""
        student_id = create_test_student["user_id"]
        deposit = create_test_equipment["deposit_amount"]
        self._give_balance(student_id, 500.00)

        response = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        })
        assert response.status_code == 200

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT reserved_tokens FROM wallets WHERE user_id = %s", (student_id,))
        wallet = cursor.fetchone()
        cursor.close()
        conn.close()

        assert float(wallet["reserved_tokens"]) == deposit

    def test_checkout_decrements_available_quantity(self, client, setup_database, create_test_student, create_test_equipment):
        """After checkout, equipment available_quantity is reduced by 1."""
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        self._give_balance(student_id, 500.00)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT available_quantity FROM equipments WHERE id = %s", (eq_id,))
        before = cursor.fetchone()["available_quantity"]
        cursor.close()
        conn.close()

        client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": eq_id
        })

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT available_quantity FROM equipments WHERE id = %s", (eq_id,))
        after = cursor.fetchone()["available_quantity"]
        cursor.close()
        conn.close()

        assert after == before - 1

    def test_checkout_insufficient_balance_returns_400(self, client, setup_database, create_test_student, create_test_equipment):
        """POST /checkout with zero balance returns 400."""
        student_id = create_test_student["user_id"]
        self._give_balance(student_id, 0.00)

        response = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        })
        assert response.status_code == 400

    def test_checkout_out_of_stock_returns_400(self, client, setup_database, create_test_student, create_test_equipment):
        """POST /checkout when equipment has no available stock returns 400."""
        eq_id = create_test_equipment["id"]
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE equipments SET available_quantity = 0 WHERE id = %s", (eq_id,))
        conn.commit()
        cursor.close()
        conn.close()

        student_id = create_test_student["user_id"]
        self._give_balance(student_id, 500.00)

        response = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": eq_id
        })
        assert response.status_code == 400

    def test_checkout_nonexistent_equipment_returns_404(self, client, setup_database, create_test_student):
        """POST /checkout with non-existent equipment_id returns 404."""
        student_id = create_test_student["user_id"]
        self._give_balance(student_id, 500.00)

        response = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": 99999
        })
        assert response.status_code == 404

    def test_checkout_nonexistent_student_returns_404(self, client, setup_database, create_test_equipment):
        """POST /checkout with unknown student_id returns 404."""
        response = client.post("/checkout", json={
            "student_id": str(uuid.uuid4()),
            "equipment_id": create_test_equipment["id"]
        })
        assert response.status_code == 404

    def test_checkout_duplicate_borrow_returns_400(self, client, setup_database, create_test_student, create_test_equipment):
        """POST /checkout for an item already borrowed by the same student returns 400."""
        student_id = create_test_student["user_id"]
        self._give_balance(student_id, 1000.00)

        r1 = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        })
        assert r1.status_code == 200

        r2 = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        })
        assert r2.status_code == 400

    def test_checkout_creates_transaction_record(self, client, setup_database, create_test_student, create_test_equipment):
        """A deposit_lock transaction entry is written after a successful checkout."""
        student_id = create_test_student["user_id"]
        self._give_balance(student_id, 500.00)

        response = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        })
        assert response.status_code == 200

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM transactions WHERE user_id = %s AND transaction_type = 'deposit_lock'",
            (student_id,)
        )
        tx = cursor.fetchone()
        cursor.close()
        conn.close()

        assert tx is not None
        assert tx["reference_type"] == "rental"
