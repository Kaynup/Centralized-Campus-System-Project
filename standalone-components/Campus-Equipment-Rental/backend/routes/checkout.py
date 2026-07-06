from fastapi import APIRouter, HTTPException, status
from database import get_connection
from pydantic import BaseModel
from typing import Any
from datetime import datetime, timedelta
import logging
import math

router = APIRouter()
logger = logging.getLogger(__name__)

LATE_FEE_PER_DAY = 50.0
RENTAL_PERIOD_DAYS = 7


class CheckoutRequest(BaseModel):
    student_id: int
    equipment_id: int


@router.post("/checkout")
def checkout(data: CheckoutRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, student_id, wallet_balance, wallet_reserved, is_active FROM students WHERE id = %s",
            (data.student_id,)  # type: ignore
        )
        student: Any = cursor.fetchone()

        if student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        if not student["is_active"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student account is inactive")

        cursor.execute(
            "SELECT id, name, deposit_amount, available_quantity FROM equipments WHERE id = %s",
            (data.equipment_id,)  # type: ignore
        )
        equipment: Any = cursor.fetchone()

        if equipment is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

        if equipment["available_quantity"] <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{equipment['name']}' is currently unavailable")

        cursor.execute(
            """
            SELECT id FROM rental_records
            WHERE student_id = %s AND equipment_id = %s AND status IN ('Borrowed', 'Late')
            LIMIT 1
            """,
            (student["id"], equipment["id"])  
        )
        existing: Any = cursor.fetchone()

        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"You already have '{equipment['name']}' borrowed. Return it before borrowing again.")

        deposit_amount = float(equipment["deposit_amount"])
        wallet_balance = float(student["wallet_balance"])
        wallet_reserved = float(student["wallet_reserved"])

        if wallet_balance < deposit_amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient balance. Required: ₹{deposit_amount}, Available: ₹{wallet_balance}")

        new_balance = wallet_balance - deposit_amount
        new_reserved = wallet_reserved + deposit_amount

        cursor.execute(
            "UPDATE students SET wallet_balance = %s, wallet_reserved = %s WHERE id = %s",
            (new_balance, new_reserved, student["id"])  # type: ignore
        )

        borrow_date = datetime.now()
        due_date = borrow_date + timedelta(days=RENTAL_PERIOD_DAYS)

        cursor.execute(
            """
            INSERT INTO rental_records (student_id, equipment_id, borrow_date, due_date, deposit_amount, status)
            VALUES (%s, %s, %s, %s, %s, 'Borrowed')
            """,
            (student["id"], equipment["id"], borrow_date, due_date, deposit_amount)  # type: ignore
        )
        rental_record_id = cursor.lastrowid

        new_available_quantity = equipment["available_quantity"] - 1

        cursor.execute(
            "UPDATE equipments SET available_quantity = %s WHERE id = %s",
            (new_available_quantity, equipment["id"])  # type: ignore
        )

        cursor.execute(
            """
            INSERT INTO transactions (student_id, rental_record_id, transaction_type, amount, balance_before, balance_after)
            VALUES (%s, %s, 'deposit_lock', %s, %s, %s)
            """,
            (student["id"], rental_record_id, deposit_amount, wallet_balance, new_balance)  # type: ignore
        )

        conn.commit()

        logger.info(f"CHECKOUT | student_id={student['student_id']} | item_id={equipment['id']} | deposit_amount={deposit_amount}")

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Checkout failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    return {
        "message": "Equipment checked out successfully",
        "rental_record_id": rental_record_id,
        "item": equipment["name"],
        "deposit_locked": deposit_amount,
        "borrow_date": borrow_date.strftime("%Y-%m-%d %H:%M:%S"),
        "due_date": due_date.strftime("%Y-%m-%d %H:%M:%S"),
        "wallet_balance": new_balance,
        "wallet_reserved": new_reserved
    }