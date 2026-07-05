import os
from datetime import datetime
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import get_db_connection

bearer_scheme = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkeycampuscore123!")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """
    FastAPI dependency. Validates the Bearer JWT token issued by the Centralized Core 
    and returns the authenticated user row as a dictionary.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": "Invalid or expired token."},
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, login_id, full_name, email, role, is_active, is_verified 
            FROM users 
            WHERE id = %s
            """,
            (user_id,)
        )
        user = cursor.fetchone()

    if not user or not user["is_active"]:
        raise credentials_exception

    # Update last_seen_at locally in the database
    try:
        from datetime import timezone
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET last_seen_at = %s WHERE id = %s",
                (now_utc, user_id)
            )
            conn.commit()
    except Exception:
        # Don't fail the request if updating last_seen_at fails
        pass

    return user
