from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import User
from app.db.schemas import UserCreate

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Return a User by primary key, or None if not found."""
    return db.get(User , user_id)


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Return a User by email address (case-sensitive), or None."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id_for_update(db: Session, user_id: int) -> Optional[User]:
    """Return a User by primary key, locking the row until the transaction completes."""
    return db.query(User).filter(User.id == user_id).with_for_update().first()


def create_user(
    db: Session,
    user_create: UserCreate,
    hashed_password: str,
    token_balance: float = 50.0,
) -> User:
    """
    Insert a new User row.
    Password must be hashed BEFORE calling this — never pass a plain password.
    """
    user = User(
        full_name=user_create.full_name,
        email=user_create.email,
        hashed_password=hashed_password,
        role=user_create.role,
        token_balance=token_balance,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def update_user_token_balance(db: Session, user_id: int, delta: float, commit: bool = True) -> User:
    """
    Atomically add `delta` to a user's token_balance.
    delta can be negative (deduction).
    Raises ValueError if resulting balance would go below 0.
    """
    user = get_user_by_id_for_update(db, user_id)

    if user is None:
        raise ValueError("User not found")

    new_balance = user.token_balance + delta

    if new_balance < 0:
        raise ValueError("Insufficient tokens")

    user.token_balance = new_balance

    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(user)

    return user


def get_all_users(db: Session, skip: int = 0, limit: int = 50) -> List[User]:
    """Return a paginated list of all users (admin use only)."""
    return (
        db.query(User)
        .offset(skip)
        .limit(limit)
        .all()
    )


def deactivate_user(db: Session, user_id: int) -> User:
    """Soft-delete: set is_active=False on the user."""
    user = get_user_by_id(db , user_id)
    if user is None:
        raise ValueError("User Not Found")
    user.is_active = False
    db.commit()
    db.refresh(user)

    return user
