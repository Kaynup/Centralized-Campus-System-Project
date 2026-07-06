from fastapi import APIRouter, HTTPException, status
from database import get_connection
from typing import Any

router = APIRouter()


@router.get("/inventory")
def get_inventory():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, name, description, category, deposit_amount, available_quantity
            FROM equipments
            WHERE available_quantity > 0
            ORDER BY category, name
            """
        )
        items = cursor.fetchall()
        return {"inventory": items}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inventory: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()


@router.get("/inventory/{equipment_id}")
def get_single_equipment(equipment_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, name, description, category, deposit_amount, available_quantity
            FROM equipments
            WHERE id = %s
            """,
            (equipment_id,)  # type: ignore
        )
        item: Any = cursor.fetchone()

        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Equipment not found"
            )

        return {"equipment": item}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch equipment: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()
