"""
test_checkout_flow.py
─────────────────────
End-to-end integration tests for the equipment checkout/return lifecycle.

These tests exercise the full business flow rather than individual endpoints:
  checkout → verify state → return → verify state

Requires a running MySQL instance with campus_central_db initialised.
Run from backends/equipment/:
    python -m pytest tests/integration/test_checkout_flow.py -v
"""

import pytest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import get_connection


# ── helpers ──────────────────────────────────────────────────────────────────

def _set_wallet(student_id: str, balance: float, reserved: float = 0.00):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE wallets SET token_balance = %s, reserved_tokens = %s WHERE user_id = %s",
        (balance, reserved, student_id)
    )
    conn.commit()
    cursor.close()
    conn.close()


def _get_wallet(student_id: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT token_balance, reserved_tokens FROM wallets WHERE user_id = %s",
        (student_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def _get_equipment_qty(equipment_id: int) -> int:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT available_quantity FROM equipments WHERE id = %s", (equipment_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row["available_quantity"]


def _insert_overdue_rental(student_id: str, equipment_id: int, deposit: float,
                            days_overdue: int = 3) -> int:
    borrow_date = datetime.now() - timedelta(days=10)
    due_date = datetime.now() - timedelta(days=days_overdue)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO rental_records
        (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
        VALUES (%s, %s, %s, %s, %s, 'Late')
    """, (student_id, equipment_id, borrow_date, due_date, deposit))
    conn.commit()
    rental_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return rental_id


# ── test class ───────────────────────────────────────────────────────────────

class TestEquipmentCheckoutFlow:
    """Full end-to-end flows for the checkout → return lifecycle."""

    def test_full_checkout_then_return_on_time(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        deposit = create_test_equipment["deposit_amount"]
        initial_balance = 500.00

        _set_wallet(student_id, initial_balance)
        initial_qty = _get_equipment_qty(eq_id)

        # ── Step 1: Checkout ──────────────────────────────────────────────
        checkout_resp = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": eq_id
        }, headers=auth_headers)
        assert checkout_resp.status_code == 200
        rental_id = checkout_resp.json()["rental_record_id"]

        wallet_after_checkout = _get_wallet(student_id)
        assert float(wallet_after_checkout["token_balance"]) == pytest.approx(initial_balance - deposit)
        assert float(wallet_after_checkout["reserved_tokens"]) == pytest.approx(deposit)
        assert _get_equipment_qty(eq_id) == initial_qty - 1

        # ── Step 2: Return on time ────────────────────────────────────────
        return_resp = client.post("/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        }, headers=auth_headers)
        assert return_resp.status_code == 200
        return_data = return_resp.json()
        assert return_data["late_fee"] == 0.0
        assert float(return_data["refund_amount"]) == pytest.approx(deposit)

        wallet_after_return = _get_wallet(student_id)
        assert float(wallet_after_return["token_balance"]) == pytest.approx(initial_balance)
        assert float(wallet_after_return["reserved_tokens"]) == pytest.approx(0.0)
        assert _get_equipment_qty(eq_id) == initial_qty

    def test_checkout_then_return_with_late_fee(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        deposit = 50.00
        initial_balance = 200.00
        days_overdue = 2

        _set_wallet(student_id, initial_balance, deposit)
        rental_id = _insert_overdue_rental(student_id, eq_id, deposit, days_overdue=days_overdue)

        return_resp = client.post("/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        }, headers=auth_headers)
        assert return_resp.status_code == 200
        data = return_resp.json()
        assert data["late_fee"] > 0
        assert float(data["refund_amount"]) == pytest.approx(deposit - data["late_fee"], abs=0.01)

        wallet = _get_wallet(student_id)
        assert float(wallet["reserved_tokens"]) == pytest.approx(0.0)

    def test_late_fee_capped_at_deposit(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        deposit = 50.00
        _set_wallet(student_id, 200.00, deposit)
        rental_id = _insert_overdue_rental(student_id, eq_id, deposit, days_overdue=10)

        resp = client.post("/return", json={
            "student_id": student_id,
            "rental_id": rental_id
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["late_fee"] <= deposit
        assert float(data["refund_amount"]) >= 0.0

    def test_checkout_blocks_double_borrow_same_item(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        _set_wallet(student_id, 1000.00)

        r1 = client.post("/checkout", json={"student_id": student_id, "equipment_id": eq_id}, headers=auth_headers)
        assert r1.status_code == 200

        r2 = client.post("/checkout", json={"student_id": student_id, "equipment_id": eq_id}, headers=auth_headers)
        assert r2.status_code == 400

    def test_insufficient_balance_prevents_checkout(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        deposit = create_test_equipment["deposit_amount"]
        _set_wallet(student_id, deposit - 0.01)

        resp = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": create_test_equipment["id"]
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_return_marks_rental_as_returned(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        _set_wallet(student_id, 500.00)

        checkout_resp = client.post("/checkout", json={
            "student_id": student_id,
            "equipment_id": eq_id
        }, headers=auth_headers)
        rental_id = checkout_resp.json()["rental_record_id"]

        client.post("/return", json={"student_id": student_id, "rental_id": rental_id}, headers=auth_headers)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT status FROM rental_records WHERE id = %s", (rental_id,))
        record = cursor.fetchone()
        cursor.close()
        conn.close()

        assert record["status"] == "Returned"

    def test_return_late_fee_transaction_written(
        self, client, auth_headers, setup_database, create_test_student, create_test_equipment
    ):
        student_id = create_test_student["user_id"]
        eq_id = create_test_equipment["id"]
        deposit = 50.00
        _set_wallet(student_id, 200.00, deposit)
        rental_id = _insert_overdue_rental(student_id, eq_id, deposit, days_overdue=2)

        resp = client.post("/return", json={"student_id": student_id, "rental_id": rental_id}, headers=auth_headers)
        assert resp.status_code == 200

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM transactions WHERE user_id = %s AND transaction_type = 'late_fee_deduction'",
            (student_id,)
        )
        tx = cursor.fetchone()
        cursor.close()
        conn.close()

        assert tx is not None
        assert float(tx["token_amount"]) > 0
