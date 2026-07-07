from typing import Optional
from fastapi import Depends, HTTPException, status


def get_current_user(token: str = None):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Auth not configured")


def get_current_user_optional(token: Optional[str] = None):
    return None


def require_admin(current_user=Depends(get_current_user)):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_professor_or_admin(current_user=Depends(get_current_user)):
    if getattr(current_user, "role", None) not in ("professor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Professor or Admin access required")
    return current_user
