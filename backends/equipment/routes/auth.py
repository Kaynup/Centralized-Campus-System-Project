import hashlib
import uuid
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_connection

router = APIRouter(prefix="/auth")


class RegisterRequest(BaseModel):
    student_id: str
    email: str
    password: str


class LoginRequest(BaseModel):
    student_id: str
    password: str


class ForgotPasswordRequest(BaseModel):
    student_id: str
    email: str
    new_password: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/register", status_code=200)
def register(payload: RegisterRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, login_id, email FROM users WHERE login_id = %s",
            (payload.student_id,),
        )
        existing_user = cursor.fetchone()

        if existing_user:
            cursor.execute(
                """
                UPDATE users
                SET full_name = %s, email = %s, password_hash = %s, is_active = TRUE, is_verified = TRUE
                WHERE id = %s
                """,
                (payload.student_id, payload.email, _hash_password(payload.password), existing_user["id"]),
            )
            user_id = existing_user["id"]
        else:
            user_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, TRUE)
                """,
                (user_id, payload.student_id, payload.student_id, payload.email, _hash_password(payload.password), "student"),
            )

        cursor.execute("SELECT id FROM wallets WHERE user_id = %s", (user_id,))
        wallet = cursor.fetchone()
        if not wallet:
            cursor.execute(
                """
                INSERT INTO wallets (id, user_id, token_balance, reserved_tokens)
                VALUES (%s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), user_id, 0.00, 0.00),
            )

        conn.commit()
        return {"student_id": payload.student_id, "message": "Student registered successfully"}

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.post("/login")
def login(payload: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, login_id, full_name, email, role, is_active, password_hash
            FROM users
            WHERE login_id = %s
            """,
            (payload.student_id,),
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if user["password_hash"] != _hash_password(payload.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not user["is_active"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student account is inactive")

        cursor.execute(
            "SELECT token_balance, reserved_tokens FROM wallets WHERE user_id = %s",
            (user["id"],),
        )
        wallet = cursor.fetchone()
        if not wallet:
            wallet = {"token_balance": 0.00, "reserved_tokens": 0.00}

        return {
            "id": user["id"],
            "student_id": user["login_id"],
            "email": user["email"],
            "wallet_balance": float(wallet["token_balance"] or 0),
            "wallet_reserved": float(wallet["reserved_tokens"] or 0),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, login_id, email FROM users WHERE login_id = %s",
            (payload.student_id,),
        )
        user = cursor.fetchone()

        if not user or user["email"] != payload.email:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (_hash_password(payload.new_password), user["id"]),
        )
        conn.commit()
        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()
