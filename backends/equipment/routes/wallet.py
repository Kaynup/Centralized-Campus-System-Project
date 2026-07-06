from fastapi import APIRouter, HTTPException, status
from database import get_connection
from typing import Any

router = APIRouter()


@router.get("/wallet/{student_id}")
def get_wallet(student_id: str):
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                u.login_id as student_id,
                w.token_balance,
                w.reserved_tokens,
                (w.token_balance + w.reserved_tokens) as total_balance
            FROM users u
            JOIN wallets w ON u.id = w.user_id
            WHERE u.id = %s AND u.role = 'student'
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
            "available_balance": wallet["token_balance"],
            "reserved_balance": wallet["reserved_tokens"],
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
def get_transactions(student_id: str):
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                t.id,
                t.transaction_type,
                t.token_amount as amount,
                t.token_balance_after as balance_after,
                t.created_at,
                e.name as equipment_name
            FROM transactions t
            LEFT JOIN rental_records r ON t.reference_id = CAST(r.id AS CHAR)
            LEFT JOIN equipments e ON r.equipment_id = e.id
            WHERE t.user_id = %s
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
