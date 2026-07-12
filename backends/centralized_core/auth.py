import os
from datetime import datetime
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models

bearer_scheme = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkeycampuscore123!")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    FastAPI dependency. Decodes access token and retrieves the corresponding User object.
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

    user = db.query(models.User).filter(models.User.id == user_id).first()
    is_admin = False
    if not user:
        user = db.query(models.AdminUser).filter(models.AdminUser.id == user_id).first()
        is_admin = True
        
    if not user or not user.is_active:
        raise credentials_exception

    # Update last seen timestamp
    try:
        from datetime import timezone
        if is_admin:
            user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
        else:
            user.last_seen_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
    except Exception:
        db.rollback()

    user.accountType = "admin" if is_admin else "user"
    return user

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> models.AdminUser:
    """
    FastAPI dependency for admin endpoints. Decodes access token and retrieves the corresponding AdminUser object.
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
        admin_id: str = payload.get("sub")
        if admin_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    admin = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if not admin or not admin.is_active:
        raise credentials_exception

    # Update last login timestamp
    try:
        from datetime import timezone
        admin.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
    except Exception:
        db.rollback()

    return admin
