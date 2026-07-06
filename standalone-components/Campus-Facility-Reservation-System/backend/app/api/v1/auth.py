"""
app/api/v1/auth.py
───────────────────
Authentication endpoints: register, login, me.
TODO (Phase 7): Full implementation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import UserCreate, UserLogin, UserOut, UserPreferencesUpdate
from app.db.crud import create_user, get_user_by_email, create_log
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.db.models import LogLevel, User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=True,
    summary="Register a new user",
    responses={400: {"description": "Email already registered"}},
)
def register(
    user_create: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = get_user_by_email(
        db,
        user_create.email,
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    hashed_password = hash_password(
        user_create.password
    )

    user = create_user(
        db,
        user_create,
        hashed_password,
    )

    create_log(
    db=db,
    level=LogLevel.INFO,
    action="USER_REGISTERED",
    message=f"User {user.email} registered",
    user_id=user.id,
    )

    return user


@router.post("/login", response_model=dict, summary="Authenticate user and return token", responses={401: {"description": "Invalid credentials"}, 400: {"description": "Bad request"}})
def login(
    user_login: UserLogin,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(
        db,
        user_login.email,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        user_login.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        {
            "sub": user.email,
        }
    )

    return {
    "access_token": access_token,
    "token_type": "bearer",
    "user": UserOut.model_validate(user).model_dump(by_alias=True),
    }


@router.get(
    "/me",
    response_model=UserOut,
    response_model_by_alias=True,
    summary="Get current authenticated user",
    responses={401: {"description": "Unauthorized"}},
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch(
    "/me/preferences",
    response_model=UserOut,
    response_model_by_alias=True,
    summary="Update current user's notification preferences",
    responses={401: {"description": "Unauthorized"}},
)
def update_preferences(
    prefs: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.db.schemas import UserPreferencesUpdate
    if prefs.pref_email_notifications is not None:
        current_user.pref_email_notifications = prefs.pref_email_notifications
    if prefs.pref_inapp_notifications is not None:
        current_user.pref_inapp_notifications = prefs.pref_inapp_notifications
    if prefs.pref_booking_reminders is not None:
        current_user.pref_booking_reminders = prefs.pref_booking_reminders
        
    db.commit()
    db.refresh(current_user)
    return current_user