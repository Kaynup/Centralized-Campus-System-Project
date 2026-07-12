import hashlib
import uuid
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_connection

router = APIRouter(prefix="/admin")


class AdminLoginRequest(BaseModel):
    admin_id: str
    password: str


class AddStudentRequest(BaseModel):
    login_id: str
    full_name: str
    email: str
    password: str


class AddEquipmentRequest(BaseModel):
    name: str
    description: str | None = None
    category: str
    deposit_amount: float
    quantity: int


class UpdateEquipmentRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    deposit_amount: float | None = None
    quantity: int | None = None


class UpdateStudentStatusRequest(BaseModel):
    is_active: bool


class AddBalanceRequest(BaseModel):
    student_id: str
    amount: float


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/login")
def admin_login(payload: AdminLoginRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, admin_id, name, email, password_hash, role, is_active FROM admin_users WHERE admin_id = %s",
            (payload.admin_id,),
        )
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        if not admin["is_active"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account is inactive")
        if admin["password_hash"] != _hash_password(payload.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

        return {"admin_id": admin["admin_id"], "name": admin["name"], "message": "Admin login successful"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.post("/add-student", status_code=201)
def add_student(payload: AddStudentRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        user_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE, TRUE)
            """,
            (user_id, payload.login_id, payload.full_name, payload.email, _hash_password(payload.password), "student"),
        )
        cursor.execute(
            """
            INSERT INTO wallets (id, user_id, token_balance, reserved_tokens)
            VALUES (%s, %s, %s, %s)
            """,
            (str(uuid.uuid4()), user_id, 0.00, 0.00),
        )
        conn.commit()
        return {"user_id": user_id, "login_id": payload.login_id, "message": "Student added successfully"}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.post("/add-equipment", status_code=201)
def add_equipment(payload: AddEquipmentRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            INSERT INTO equipments (name, description, category, deposit_amount, quantity, available_quantity, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
            """,
            (payload.name, payload.description, payload.category, payload.deposit_amount, payload.quantity, payload.quantity),
        )
        equipment_id = cursor.lastrowid
        conn.commit()
        return {"equipment_id": equipment_id, "name": payload.name, "message": "Equipment added successfully"}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.get("/students")
def get_students():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, login_id, full_name, email, role, is_active FROM users WHERE role = 'student' ORDER BY full_name"
        )
        return {"students": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()


@router.get("/dashboard-stats")
def dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'")
        total_students = cursor.fetchone()["total_students"]
        cursor.execute("SELECT COUNT(*) AS total_equipment FROM equipments")
        total_equipment = cursor.fetchone()["total_equipment"]
        cursor.execute("SELECT COUNT(*) AS active_rentals FROM rental_records WHERE status = 'Borrowed'")
        active_rentals = cursor.fetchone()["active_rentals"]
        cursor.execute("SELECT COUNT(*) AS late_rentals FROM rental_records WHERE status = 'Late'")
        late_rentals = cursor.fetchone()["late_rentals"]
        cursor.execute("SELECT COALESCE(SUM(token_balance), 0) AS total_tokens_distributed FROM wallets")
        total_tokens_distributed = cursor.fetchone()["total_tokens_distributed"]
        return {
            "total_students": total_students,
            "total_equipment": total_equipment,
            "active_rentals": active_rentals,
            "late_rentals": late_rentals,
            "total_tokens_distributed": float(total_tokens_distributed or 0),
        }
    finally:
        cursor.close()
        conn.close()


@router.get("/all-rentals")
def all_rentals():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT r.id, r.student_id, r.equipment_id, r.borrow_date, r.due_date, r.return_date, r.status, r.deposit_amount, r.late_fee
            FROM rental_records r ORDER BY r.borrow_date DESC
            """
        )
        return {"rentals": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()


@router.get("/late-rentals")
def late_rentals():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT r.id, r.student_id, r.equipment_id, r.borrow_date, r.due_date, r.status, r.late_fee
            FROM rental_records r WHERE r.status = 'Late' ORDER BY r.due_date
            """
        )
        return {"late_rentals": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()


@router.post("/add-balance")
def add_balance(payload: AddBalanceRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id FROM wallets WHERE user_id = %s", (payload.student_id,))
        wallet = cursor.fetchone()
        if not wallet:
            raise HTTPException(status_code=404, detail="Student wallet not found")
        cursor.execute(
            "UPDATE wallets SET token_balance = %s WHERE user_id = %s",
            (payload.amount, payload.student_id),
        )
        conn.commit()
        cursor.execute("SELECT token_balance FROM wallets WHERE user_id = %s", (payload.student_id,))
        new_balance = cursor.fetchone()["token_balance"]
        return {"new_balance": float(new_balance or 0)}
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.put("/update-equipment/{equipment_id}")
def update_equipment(equipment_id: int, payload: UpdateEquipmentRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        updates = []
        values = []
        for field, value in payload.dict(exclude_unset=True).items():
            if value is None:
                continue
            updates.append(f"{field} = %s")
            values.append(value)
        values.append(equipment_id)
        if not updates:
            return {"message": "No changes provided"}
        cursor.execute(f"UPDATE equipments SET {', '.join(updates)} WHERE id = %s", tuple(values))
        conn.commit()
        return {"message": "Equipment updated successfully"}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.put("/update-student-status/{student_id}")
def update_student_status(student_id: str, payload: UpdateStudentStatusRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("UPDATE users SET is_active = %s WHERE id = %s", (payload.is_active, student_id))
        conn.commit()
        return {"message": "Student status updated successfully"}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.get("/all-transactions")
def all_transactions():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT t.id, t.user_id, t.transaction_type, t.token_amount, t.token_balance_after, t.created_at
            FROM transactions t ORDER BY t.created_at DESC
            """
        )
        return {"transactions": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()
