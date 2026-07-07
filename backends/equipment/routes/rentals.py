from fastapi import APIRouter, HTTPException, status
from database import get_connection
from pydantic import BaseModel
from typing import Any
from datetime import datetime
import logging
import math
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

LATE_FEE_PER_DAY = 50.0


class ReturnRequest(BaseModel):
    student_id: str
    rental_id: int


@router.post("/return")
def return_item(data: ReturnRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Get user with wallet
        cursor.execute(
            """
            SELECT u.id, u.login_id, w.token_balance, w.reserved_tokens, w.rental_tokens_used
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.id = %s AND u.role = 'student'
            """,
            (data.student_id,)
        )
        student = cursor.fetchone()

        if student is None:
            raise HTTPException(status_code=404, detail="Student not found")

        # 2. Get rental FIRST (this is the source of truth)
        cursor.execute(
            """
            SELECT id, equipment_id, borrow_date, due_date,
                   deposit_amount, status
            FROM rental_records
            WHERE id = %s AND student_id = %s
              AND status IN ('Borrowed', 'Late')
            """,
            (data.rental_id, data.student_id)
        )

        rental = cursor.fetchone()

        if rental is None:
            raise HTTPException(
                status_code=404,
                detail="No active rental found for this item"
            )

        # 3. Get equipment USING rental.equipment_id (not request)
        cursor.execute(
            "SELECT id, name, available_quantity FROM equipments WHERE id = %s",
            (rental["equipment_id"],)
        )
        equipment = cursor.fetchone()

        if equipment is None:
            raise HTTPException(status_code=404, detail="Equipment not found")

        # 4. Prevent double return
        if rental["status"] == "Returned":
            raise HTTPException(
                status_code=400,
                detail="Already returned"
            )

        # 5. Calculate fees
        return_date = datetime.now()
        due_date = rental["due_date"]

        deposit_amount = float(rental["deposit_amount"])
        late_fee = 0.0
        days_overdue = 0

        if return_date > due_date:
            days_overdue = math.ceil(
                (return_date - due_date).total_seconds() / 86400
            )
            late_fee = min(days_overdue * LATE_FEE_PER_DAY, deposit_amount)

        refund_amount = deposit_amount - late_fee

        # 6. Wallet update
        wallet_balance = float(student["token_balance"] or 0)
        wallet_reserved = float(student["reserved_tokens"] or 0)
        rental_tokens_used = float(student["rental_tokens_used"] or 0)

        new_balance = wallet_balance + refund_amount
        new_reserved = max(0.0, wallet_reserved - deposit_amount)
        new_rental_used = max(0.0, rental_tokens_used - deposit_amount)

        cursor.execute(
            "UPDATE wallets SET token_balance=%s, reserved_tokens=%s, rental_tokens_used=%s WHERE user_id=%s",
            (new_balance, new_reserved, new_rental_used, student["id"])
        )

        # 7. Update rental
        cursor.execute(
            """
            UPDATE rental_records
            SET return_date=%s,
                status='Returned',
                late_fee=%s,
                days_overdue=%s
            WHERE id=%s
            """,
            (return_date, late_fee, days_overdue, rental["id"])
        )

        # 8. Restore stock
        cursor.execute(
            """
            UPDATE equipments
            SET available_quantity = available_quantity + 1
            WHERE id = %s
            """,
            (rental["equipment_id"],)
        )

        # 9. Transactions
        if late_fee > 0:
            cursor.execute(
                """
                INSERT INTO transactions
                (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
                VALUES (%s,%s,'rental',%s,'late_fee_deduction',%s,%s)
                """,
                (str(uuid.uuid4()), student["id"], str(rental["id"]), late_fee, wallet_balance)
            )

        cursor.execute(
            """
            INSERT INTO transactions
            (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
            VALUES (%s,%s,'rental',%s,'deposit_unlock',%s,%s)
            """,
            (str(uuid.uuid4()), student["id"], str(rental["id"]), refund_amount, new_balance)
        )

        conn.commit()

        return {
            "message": "Returned successfully",
            "item": equipment["name"],
            "late_fee": late_fee,
            "refund_amount": refund_amount,
            "wallet_balance": new_balance
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Return failed: {str(e)}")

    finally:
        cursor.close()
        conn.close()


# RENTALS LIST 

@router.get("/rentals/{student_id}")
def get_rentals(student_id: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                r.id,
                r.borrow_date,
                r.due_date,
                r.return_date,
                r.deposit_amount,
                r.status,
                r.late_fee,
                r.days_overdue,
                r.equipment_id,
                e.name AS equipment_name,
                e.category,
                e.description
            FROM rental_records r
            JOIN equipments e ON r.equipment_id = e.id
            WHERE r.student_id = %s
            ORDER BY r.borrow_date DESC
            """,
            (student_id,)
        )

        return {"rentals": cursor.fetchall()}

    finally:
        cursor.close()
        conn.close()


# ACTIVE RENTALS

@router.get("/rentals/{student_id}/active")
def get_active_rentals(student_id: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                r.id,
                r.equipment_id,
                r.borrow_date,
                r.due_date,
                r.status,
                e.name AS equipment_name,
                e.category,
                DATEDIFF(r.due_date, NOW()) AS days_remaining
            FROM rental_records r
            JOIN equipments e ON r.equipment_id = e.id
            WHERE r.student_id = %s
              AND r.status IN ('Borrowed','Late')
            ORDER BY r.due_date ASC
            """,
            (student_id,)
        )

        return {"active_rentals": cursor.fetchall()}

    finally:
        cursor.close()
        conn.close()
