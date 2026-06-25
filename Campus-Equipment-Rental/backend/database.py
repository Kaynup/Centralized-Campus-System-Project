import os
import bcrypt
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from decimal import Decimal

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        autocommit=False
    )

# def get_connection():
#     return mysql.connector.connect(
#         host="localhost",
#         user="root",
#         password="root123",
#         database="equipment_rental"
#     )

VALID_CATEGORIES = [
    "Photography & Video",
    "Computing Devices",
    "Audio Equipment",
    "Accessories & Connectivity",
    "Presentation Equipment",
    "Laboratory Equipment",
    "Other"
]

#STUDENTS
def add_student(student_id, full_name, email):
    conn = get_connection()
    try:
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO students
            (student_id, full_name, email)
            VALUES (%s, %s, %s)
            """,
            (student_id, full_name, email)
        )
        conn.commit()
        return {
            "message": "Student added successfully",
            "student_id": student_id
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
                id,
                student_id,
                full_name,
                email,
                wallet_balance,
                wallet_reserved,
                registration_completed,
                is_active
            FROM students
            ORDER BY id DESC
        """)
        return cur.fetchall()
    finally:
        conn.close()

def update_student_status(student_id: int, active: bool):
    conn = get_connection()

    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT is_active
            FROM students
            WHERE id = %s
        """, (student_id,))

        student = cur.fetchone()

        if not student:
            raise ValueError("Student not found")

        if student["is_active"] == active:
            if active:
                raise ValueError("Student is already active")
            else:
                raise ValueError("Student is already inactive")

        cur.execute("""
            UPDATE students
            SET is_active = %s
            WHERE id = %s
        """, (active, student_id))

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


def add_balance(student_id, amount):
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT wallet_balance
            FROM students
            WHERE id = %s
        """, (student_id,))

        student = cur.fetchone()

        if not student:
            raise ValueError("Student not found")

        before = Decimal(str(student["wallet_balance"]))
        amount = Decimal(str(amount))
        after = before + amount

        cur.execute("""
            UPDATE students
            SET wallet_balance = %s
            WHERE id = %s
        """, (after, student_id))

        cur.execute("""
            INSERT INTO transactions
            (student_id, transaction_type, amount, balance_before, balance_after)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            student_id,
            "wallet_add",
            amount,
            before,
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

#EQUIPMENTS
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


# def delete_equipment(equipment_id):
#     conn = get_connection()
#     try:
#         cur = conn.cursor()
#         cur.execute(
#             "DELETE FROM equipments WHERE id=%s",
#             (equipment_id,)
#         )
#         conn.commit()
#         return {
#             "message": "Equipment deleted successfully"
#         }
#     except Exception:
#         conn.rollback()
#         raise
#     finally:
#         conn.close()

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


#DASHBOARD
def get_dashboard_stats():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT COUNT(*) AS total_students FROM students"
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
            SELECT COALESCE(SUM(wallet_reserved), 0)
            AS locked_deposits
            FROM students
        """)
        locked_deposits = cur.fetchone()

        cur.execute("""
            SELECT
            s.full_name,
            e.name AS equipment_name,
            r.borrow_date
            FROM rental_records r
            JOIN students s ON r.student_id = s.id
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


#RENTALS
def get_recent_rentals():
    conn = get_connection()

    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                s.full_name,
                e.name AS equipment_name,
                r.borrow_date
            FROM rental_records r
            JOIN students s
                ON r.student_id = s.id
            JOIN equipments e
                ON r.equipment_id = e.id
            ORDER BY r.borrow_date DESC
            LIMIT 5
        """)

        return cur.fetchall()

    finally:
        conn.close()


def get_all_rentals():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                r.id,
                s.student_id,
                s.full_name,
                e.name AS equipment_name,
                r.borrow_date,
                r.due_date,
                r.return_date,
                r.deposit_amount,
                r.status,
                r.late_fee
            FROM rental_records r
            JOIN students s
                ON r.student_id = s.id
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
                s.student_id,
                s.full_name,
                e.name AS equipment_name,
                r.due_date,
                r.days_overdue,
                r.late_fee
            FROM rental_records r
            JOIN students s
                ON r.student_id = s.id
            JOIN equipments e
                ON r.equipment_id = e.id
            WHERE r.status = 'Late'
            ORDER BY r.due_date
        """)

        return cur.fetchall()

    finally:
        conn.close()

#TRANSACTIONS

def get_all_transactions():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                t.id,
                s.student_id,
                s.full_name,
                t.transaction_type,
                t.amount,
                t.balance_before,
                t.balance_after,
                t.created_at
            FROM transactions t
            JOIN students s
                ON t.student_id = s.id
            ORDER BY t.created_at DESC
        """)

        return cur.fetchall()

    finally:
        conn.close()