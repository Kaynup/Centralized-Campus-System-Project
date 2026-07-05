from fastapi import APIRouter, HTTPException
from ..database import get_connection
import bcrypt
from ..models import StudentCreate, EquipmentCreate, EquipmentUpdate, AdminLogin, BalanceAdd
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

def add_student(login_id, full_name, email, password_hash):
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Insert into users table
        cur.execute(
            """
            INSERT INTO users
            (login_id, full_name, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, 'student', TRUE)
            """,
            (login_id, full_name, email, password_hash)
        )
        user_id = cur.lastrowid
        
        # Create wallet for this user
        cur.execute(
            """
            INSERT INTO wallets
            (user_id, token_balance, reserved_tokens)
            VALUES (%s, 0.00, 0.00)
            """,
            (user_id,)
        )
        
        conn.commit()
        return {
            "message": "Student added successfully",
            "login_id": login_id
        }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_students():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                u.id,
                u.login_id,
                u.full_name,
                u.email,
                w.token_balance,
                w.reserved_tokens,
                u.is_active
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.role = 'student'
            ORDER BY u.created_at DESC
        """)
        return cur.fetchall()
    finally:
        conn.close()


def update_student_status(user_id: str, active: bool):
    conn = get_connection()

    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT is_active
            FROM users
            WHERE id = %s AND role = 'student'
        """, (user_id,))

        student = cur.fetchone()

        if not student:
            raise ValueError("Student not found")

        if student["is_active"] == active:
            if active:
                raise ValueError("Student is already active")
            else:
                raise ValueError("Student is already inactive")

        cur.execute("""
            UPDATE users
            SET is_active = %s
            WHERE id = %s
        """, (active, user_id))

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def add_balance(user_id, amount):
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT w.token_balance
            FROM wallets w
            WHERE w.user_id = %s
        """, (user_id,))

        wallet = cur.fetchone()

        if not wallet:
            raise ValueError("User not found or no wallet")

        before = Decimal(str(wallet["token_balance"]))
        amount = Decimal(str(amount))
        after = before + amount

        cur.execute("""
            UPDATE wallets
            SET token_balance = %s
            WHERE user_id = %s
        """, (after, user_id))

        cur.execute("""
            INSERT INTO transactions
            (user_id, reference_type, transaction_type, token_amount, token_balance_after)
            VALUES (%s, 'manual_adjustment', 'token_topup', %s, %s)
        """, (
            user_id,
            amount,
            after
        ))

        conn.commit()

        return {
            "message": "Balance added successfully",
            "balance_before": str(before),
            "balance_after": str(after)
        }

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


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

@router.post("/admin/login", tags=["Admin/auth"])
def admin_login(data: AdminLogin):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM admin_users
            WHERE email = %s
        """, (data.email,))

        admin = cursor.fetchone()

        if not admin:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not bcrypt.checkpw(
            data.password.encode("utf-8"),
            admin["password_hash"].encode("utf-8")
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        return {
            "message": "Login successful",
            "admin_id": admin["id"],
            "email": admin["email"]
        }

    finally:
        cursor.close()
        conn.close()

@router.post("/admin/students", tags=["Admin/student"])
def admin_add_student(student: StudentCreate):
    try:
        import hashlib
        password_hash = hashlib.sha256(student.password.encode()).hexdigest()
        return add_student(
            student.login_id,
            student.full_name,
            student.email,
            password_hash
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
@router.get("/admin/students", tags=["Admin/student"])
def list_students():
    return get_students()

@router.patch("/admin/students/{student_id}/activate", tags=["Admin/student"])
def activate_student(student_id: int):
    try:
        update_student_status(student_id, True)

        return {
            "message": "Student activated successfully"
        }

    except ValueError as e:
        message = str(e)

        if message == "Student not found":
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=400, detail=message)
    

@router.patch("/admin/students/{student_id}/deactivate", tags=["Admin/student"])
def deactivate_student(student_id: int):
    try:
        update_student_status(student_id, False)

        return {
            "message": "Student deactivated successfully"
        }

    except ValueError as e:
        message = str(e)

        if message == "Student not found":
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=400, detail=message)
    
@router.post("/admin/students/{student_id}/add-balance", tags=["Admin/student"])
def admin_add_balance(student_id: int, data: BalanceAdd):
    return add_balance(student_id, data.amount)

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
