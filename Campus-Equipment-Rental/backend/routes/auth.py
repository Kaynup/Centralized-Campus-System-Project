from fastapi import APIRouter, HTTPException, status
from database import get_connection
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
        
        cursor.execute(
            "SELECT id, registration_completed, is_active FROM students WHERE student_id = %s",
            (data.student_id,) 
        )
        student: Any = cursor.fetchone()

        
        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student ID not found. Please contact admin."
            )

        
        if student["registration_completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account already registered. Please login."
            )

        
        cursor.execute(
            """
            UPDATE students
            SET email = %s, password_hash = %s, registration_completed = TRUE
            WHERE student_id = %s
            """,
            (data.email, password_hash, data.student_id)  
        )
        conn.commit()

    except HTTPException:
        raise
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
            "SELECT * FROM students WHERE student_id = %s AND password_hash = %s",
            (data.student_id, password_hash)  # type: ignore
        )
        student: Any = cursor.fetchone()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid student ID or password"
        )


    if not student["registration_completed"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please complete registration first."
        )

    
    if not student["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact admin."
        )

    return {
        "message": "Login successful",
        "id": student.get("id"),                          
        "student_id": student.get("student_id"),          
        "email": student.get("email"),
        "wallet_balance": student.get("wallet_balance"),
        "wallet_reserved": student.get("wallet_reserved")
    }


@router.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
  
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        
        cursor.execute(
            "SELECT id FROM students WHERE student_id = %s AND email = %s AND registration_completed = TRUE",
            (data.student_id, data.email)  
        )
        student: Any = cursor.fetchone()

        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered account found with that student ID and email"
            )

        
        new_hash = hash_password(data.new_password)
        cursor.execute(
            "UPDATE students SET password_hash = %s WHERE id = %s",
            (new_hash, student["id"])  
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