from fastapi import APIRouter, HTTPException
from database import get_connection
from models import EquipmentCreate, EquipmentUpdate
from decimal import Decimal

router = APIRouter()

VALID_CATEGORIES = [
    "Photography & Video",
    "Computing Devices",
    "Audio Equipment",
    "Accessories & Connectivity",
    "Presentation Equipment",
    "Laboratory Equipment",
    "Other"
]

# ==================== UTILITY FUNCTIONS ====================




def add_equipment(
    name,
    description,
    category,
    deposit_amount,
    quantity
):
    if category not in VALID_CATEGORIES:
        raise ValueError("Invalid equipment category")

    conn = get_connection()

    try:
        cur = conn.cursor(dictionary=True)

        # 1. Check if equipment already exists
        cur.execute(
            "SELECT id, available_quantity FROM equipments WHERE name = %s",
            (name,)
        )
        existing = cur.fetchone()

        # 2. If exists, update quantity instead of inserting duplicate
        if existing:
            cur.execute(
                """
                UPDATE equipments
                SET available_quantity = available_quantity + %s,
                    quantity = quantity + %s
                WHERE id = %s
                """,
                (quantity, quantity, existing["id"])
            )

            conn.commit()
            return {
                "message": "Equipment already exists, quantity updated"
            }

        # 3. If not exists, insert new row
        cur.execute(
            """
            INSERT INTO equipments
            (
                name,
                description,
                category,
                deposit_amount,
                quantity,
                available_quantity
            )
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (
                name,
                description,
                category,
                deposit_amount,
                quantity,
                quantity
            )
        )
        conn.commit()
        return {
            "message": "Equipment added successfully"
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_equipments():
    conn = get_connection()

    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT *
            FROM equipments
            ORDER BY id DESC
        """)
        return cur.fetchall()
    finally:
        conn.close()


def update_equipment(
    equipment_id,
    name,
    description,
    category,
    deposit_amount,
    quantity
):
    if category not in VALID_CATEGORIES:
        raise ValueError("Invalid equipment category")
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE equipments
            SET
                name=%s,
                description=%s,
                category=%s,
                deposit_amount=%s,
                quantity=%s
            WHERE id=%s
        """,
        (
            name,
            description,
            category,
            deposit_amount,
            quantity,
            equipment_id
        ))
        conn.commit()
        return {
            "message": "Equipment updated successfully"
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_equipment_status(equipment_id, is_active):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE equipments
            SET is_active = %s
            WHERE id = %s
        """, (is_active, equipment_id))

        if cursor.rowcount == 0:
            raise ValueError("Equipment not found")

        conn.commit()

    finally:
        cursor.close()
        conn.close()


def get_dashboard_stats():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"
        )
        students = cur.fetchone()

        cur.execute(
            "SELECT COUNT(*) AS total_equipments FROM equipments"
        )
        equipments = cur.fetchone()

        cur.execute("""
            SELECT COUNT(*) AS borrowed
            FROM rental_records
            WHERE status='Borrowed'
        """)
        borrowed = cur.fetchone()

        cur.execute("""
            SELECT COUNT(*) AS available
            FROM equipments
            WHERE available_quantity > 0
        """)
        available = cur.fetchone()

        cur.execute("""
            SELECT COUNT(*) AS late
            FROM rental_records
            WHERE status='Late'
        """)
        late = cur.fetchone()

        cur.execute("""
            SELECT COALESCE(SUM(late_fee), 0) 
            AS total_penalties
            FROM rental_records
        """)
        total_penalties = cur.fetchone()

        cur.execute("""
            SELECT COALESCE(SUM(w.reserved_tokens), 0)
            AS locked_deposits
            FROM wallets w
            JOIN users u ON w.user_id = u.id
            WHERE u.role = 'student'
        """)
        locked_deposits = cur.fetchone()

        cur.execute("""
            SELECT
            u.full_name,
            e.name AS equipment_name,
            r.borrow_date
            FROM rental_records r
            JOIN users u ON r.student_id = u.id
            JOIN equipments e ON r.equipment_id = e.id
            ORDER BY r.borrow_date DESC
            LIMIT 5
        """)

        recent_rentals = cur.fetchall()


        return {
            "total_students": students["total_students"],
            "total_equipments": equipments["total_equipments"],
            "available": available["available"],
            "borrowed": borrowed["borrowed"],
            "late": late["late"],
            "total_penalties": total_penalties["total_penalties"],
            "locked_deposits": locked_deposits["locked_deposits"],
            "recent_rentals": recent_rentals
        }
    
    finally:
        conn.close()


def get_all_rentals():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                r.id,
                u.login_id,
                u.full_name,
                e.name AS equipment_name,
                r.borrow_date,
                r.due_date,
                r.return_date,
                r.deposit_amount,
                r.status,
                r.late_fee
            FROM rental_records r
            JOIN users u
                ON r.student_id = u.id
            JOIN equipments e
                ON r.equipment_id = e.id
            ORDER BY r.borrow_date DESC
        """)

        return cur.fetchall()

    finally:
        conn.close()


def get_late_rentals():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                r.id,
                u.login_id,
                u.full_name,
                e.name AS equipment_name,
                r.due_date,
                r.days_overdue,
                r.late_fee
            FROM rental_records r
            JOIN users u
                ON r.student_id = u.id
            JOIN equipments e
                ON r.equipment_id = e.id
            WHERE r.status = 'Late'
            ORDER BY r.due_date
        """)

        return cur.fetchall()

    finally:
        conn.close()


def get_all_transactions():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                t.id,
                u.login_id,
                u.full_name,
                t.transaction_type,
                t.token_amount as amount,
                t.token_balance_after as balance_after,
                t.created_at
            FROM transactions t
            JOIN users u
                ON t.user_id = u.id
            WHERE u.role = 'student'
            ORDER BY t.created_at DESC
        """)

        return cur.fetchall()

    finally:
        conn.close()


# ==================== ROUTES ====================



#equipments
@router.post("/admin/equipments", tags=["Admin/equipment"])
def admin_add_equipment(equipment: EquipmentCreate):
    try:
        return add_equipment(
            equipment.name,
            equipment.description,
            equipment.category,
            equipment.deposit_amount,
            equipment.quantity
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.get("/admin/equipments", tags=["Admin/equipment"])
def admin_get_equipments():
    return get_equipments()


@router.put("/admin/equipments/{equipment_id}", tags=["Admin/equipment"])
def admin_update_equipment(
    equipment_id: int,
    equipment: EquipmentUpdate
):
    try:
        return update_equipment(
            equipment_id,
            equipment.name,
            equipment.description,
            equipment.category,
            equipment.deposit_amount,
            equipment.quantity
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.patch("/admin/equipments/{equipment_id}/activate",
    tags=["Admin/equipment"]
)
def activate_equipment(equipment_id: int):
    try:
        update_equipment_status(
            equipment_id,
            True
        )

        return {
            "message": "Equipment activated successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    

@router.patch("/admin/equipments/{equipment_id}/deactivate",
    tags=["Admin/equipment"]
)
def deactivate_equipment(equipment_id: int):
    try:
        update_equipment_status(
            equipment_id,
            False
        )

        return {
            "message": "Equipment deactivated successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )


@router.get("/admin/equipment-categories", tags=["Admin/equipment"])
def get_categories():
    return {
        "categories": VALID_CATEGORIES
    }

@router.get("/admin/rentals", tags=["Admin/rental"])
def admin_get_all_rentals(): 
    return get_all_rentals()


@router.get("/admin/rentals/late", tags=["Admin/rental"])
def late_rentals():
    return get_late_rentals()


@router.get("/admin/dashboard", tags=["Admin/dashboard"])
def dashboard():
    return get_dashboard_stats()


@router.get("/admin/transactions", tags=["Admin/transactions"])
def transactions():
    return get_all_transactions()
