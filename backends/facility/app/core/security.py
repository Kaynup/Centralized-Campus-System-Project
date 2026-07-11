"""
app/core/security.py
────────────────────
JWT authentication for the Facility microservice.

Tokens are issued by the Centralized Core service with:
  - sub = user UUID (string)
  - The same SECRET_KEY and ALGORITHM env vars as all other services

This module provides FastAPI dependencies that are consistent with
the Equipment and Marketplace microservices.
"""

import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db

bearer_scheme = HTTPBearer()
bearer_scheme_optional = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkeycampuscore123!")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


def _fetch_user_from_db(db: Session, user_id: str) -> Optional[dict]:
    """
    Look up a user by UUID in the users table.
    Falls back to admin_users table if not found.
    Returns a plain dict or None.
    """
    row = db.execute(
        text(
            "SELECT id, login_id, full_name, email, role, is_active "
            "FROM users WHERE id = :uid"
        ),
        {"uid": user_id},
    ).fetchone()

    if row:
        return {
            "id": row[0],
            "login_id": row[1],
            "full_name": row[2],
            "email": row[3],
            "role": row[4],
            "is_active": row[5],
            "accountType": "user",
        }

    # Fallback: check admin_users table
    admin_row = db.execute(
        text(
            "SELECT id, admin_id, name, email, role, is_active "
            "FROM admin_users WHERE id = :uid"
        ),
        {"uid": user_id},
    ).fetchone()

    if admin_row:
        return {
            "id": admin_row[0],
            "login_id": admin_row[1],
            "full_name": admin_row[2],
            "email": admin_row[3],
            "role": admin_row[4],
            "is_active": admin_row[5],
            "accountType": "admin",
        }

    return None


class _UserObject:
    """Thin wrapper so routers can use dot-notation (current_user.id, current_user.role)."""

    def __init__(self, data: dict):
        self.id = data["id"]
        self.role = data.get("role", "student")
        self.email = data.get("email", "")
        self.full_name = data.get("full_name", "")
        self.is_active = data.get("is_active", True)
        self.accountType = data.get("accountType", "user")

    def __getitem__(self, key):
        return getattr(self, key)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> _UserObject:
    """
    Validate the Bearer JWT and return the authenticated user.
    Raises 401 if the token is missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_data = _fetch_user_from_db(db, user_id)

    if user_data is None or not user_data.get("is_active"):
        raise credentials_exception

    return _UserObject(user_data)


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[_UserObject]:
    """Return the current user if a valid token is provided, otherwise None."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None


def require_admin(
    current_user: _UserObject = Depends(get_current_user),
) -> _UserObject:
    """Guard: only admin accounts may pass."""
    if current_user.role != "admin" and current_user.accountType != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_professor_or_admin(
    current_user: _UserObject = Depends(get_current_user),
) -> _UserObject:
    """Guard: professor or admin accounts may pass."""
    if current_user.role not in ("professor", "admin") and current_user.accountType != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professor or Admin access required",
        )
    return current_user
