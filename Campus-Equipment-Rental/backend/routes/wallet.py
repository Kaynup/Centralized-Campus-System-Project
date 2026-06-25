from fastapi import APIRouter, HTTPException, status
from database import get_connection
from typing import Any

router = APIRouter()


@router.get("/wallet/{student_id}")
def get_wallet(student_id: int):
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                student_id,
                wallet_balance,
                wallet_reserved,
                (wallet_balance + wallet_reserved) as total_balance
            FROM students
            WHERE id = %s
            """,
            (student_id,)  
        )
        wallet: Any = cursor.fetchone()

        if wallet is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )

        return {
            "student_id": wallet["student_id"],
            "available_balance": wallet["wallet_balance"],
            "reserved_balance": wallet["wallet_reserved"],
            "total_balance": wallet["total_balance"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch wallet: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()


@router.get("/wallet/{student_id}/transactions")
def get_transactions(student_id: int):
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                t.id,
                t.transaction_type,
                t.amount,
                t.balance_before,
                t.balance_after,
                t.created_at,
                e.name as equipment_name
            FROM transactions t
            LEFT JOIN rental_records r ON t.rental_record_id = r.id
            LEFT JOIN equipments e ON r.equipment_id = e.id
            WHERE t.student_id = %s
            ORDER BY t.created_at DESC
            """,
            (student_id,)  
        )
        transactions: Any = cursor.fetchall()
        return {"transactions": transactions}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transactions: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()