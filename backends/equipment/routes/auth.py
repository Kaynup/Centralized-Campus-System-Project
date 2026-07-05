from fastapi import APIRouter, HTTPException, status
from ..database import get_connection
from pydantic import BaseModel, EmailStr
from typing import Any
import hashlib

router = APIRouter()


class RegisterRequest(BaseModel):
    student_id: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    student_id: str
    password: str


class ForgotPasswordRequest(BaseModel):
    student_id: str
    email: EmailStr
    new_password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@router.post("/auth/register", status_code=status.HTTP_200_OK)
def register(data: RegisterRequest):
    
    password_hash = hash_password(data.password)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if user already exists
        cursor.execute(
            "SELECT id, is_verified FROM users WHERE login_id = %s",
            (data.student_id,) 
        )
        user = cursor.fetchone()

        
        if user is None:
            # Create new user
            cursor.execute(
                """
                INSERT INTO users
                (login_id, full_name, email, password_hash, role, is_active, is_verified)
                VALUES (%s, %s, %s, %s, 'student', TRUE, TRUE)
                """,
                (data.student_id, data.student_id, data.email, password_hash)  
            )
            user_id = cursor.lastrowid
            
            # Create wallet for new user
            cursor.execute(
                """
                INSERT INTO wallets
                (user_id, token_balance, reserved_tokens)
                VALUES (%s, 0.00, 0.00)
                """,
                (user_id,)
            )
            conn.commit()
        else:
            # User exists, just update
            cursor.execute(
                """
                UPDATE users
                SET email = %s, password_hash = %s, is_verified = TRUE
                WHERE login_id = %s
                """,
                (data.email, password_hash, data.student_id)  
            )
            conn.commit()

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

    return {"message": "Account activated successfully", "student_id": data.student_id}


@router.post("/auth/login")
def login(data: LoginRequest):
    
    password_hash = hash_password(data.password)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT u.*, w.token_balance, w.reserved_tokens 
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.login_id = %s AND u.password_hash = %s AND u.role = 'student'
            """,
            (data.student_id, password_hash)  # type: ignore
        )
        user: Any = cursor.fetchone()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid student ID or password"
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact admin."
        )

    return {
        "message": "Login successful",
        "id": user.get("id"),                          
        "student_id": user.get("login_id"),          
        "email": user.get("email"),
        "wallet_balance": user.get("token_balance"),
        "wallet_reserved": user.get("reserved_tokens")
    }


@router.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
  
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        
        cursor.execute(
            "SELECT id FROM users WHERE login_id = %s AND email = %s AND role = 'student'",
            (data.student_id, data.email)  
        )
        user: Any = cursor.fetchone()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered account found with that student ID and email"
            )

        
        new_hash = hash_password(data.new_password)
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (new_hash, user["id"])  
        )
        conn.commit()

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

    return {"message": "Password reset successfully"}
