"""
app/services/user_service.py
─────────────────────────────
User and token-grant business logic.
TODO (Phase 8): Full implementation.
"""

from sqlalchemy.orm import Session
from app.db import crud
from app.core.security import hash_password
from app.db.models import TransactionType, UserRole


def get_initial_tokens(role) -> int:
    if isinstance(role, str):
        try:
            role = UserRole(role.strip().lower())
        except ValueError:
            pass
    if role == UserRole.student:
        return 5
    elif role == UserRole.professor:
        return 20
    elif role == UserRole.admin:
        return 999
    return 5
def register_user(db: Session, user_data):
    """
    Creates a new user and issues the initial 50-token GRANT transaction.
    TODO (Phase 8)
    """
    existing = crud.get_user_by_email(db, user_data.email)
    if existing:
        raise ValueError("Email already registered")

    hashed = hash_password(user_data.password)
    initial_tokens = get_initial_tokens(user_data.role)

    user = crud.create_user(db, user_data, hashed_password=hashed, token_balance=initial_tokens)

    # record initial grant transaction
    crud.create_transaction(
        db,
        user_id=user.id,
        type=TransactionType.GRANT,
        amount=initial_tokens,
        balance_after=user.token_balance,
        booking_id=None,
        description="Initial grant"
    )

    return user


def get_token_balance(db: Session, user_id: int):
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise ValueError("User not found")

    txs = crud.get_transactions_by_user(db, user_id, skip=0, limit=10)

    return {"user_id": user.id, "balance": user.token_balance, "recent_transactions": txs}


def admin_grant_tokens(db: Session, admin_user, target_user_id: int, amount: float, reason: str):
    if admin_user.role != UserRole.admin:
        raise PermissionError("Admin role required")

    # add tokens
    user = crud.update_user_token_balance(db, target_user_id, amount)

    crud.create_transaction(
        db,
        user_id=target_user_id,
        type=TransactionType.GRANT,
        amount=amount,
        balance_after=user.token_balance,
        description=reason,
    )

    return user


def monthly_token_reset(db: Session):
    """
    Reset all active users to their role-based initial tokens and record GRANT transactions.
    Intended to be triggered by a cron job or management command.
    TODO (Phase 8)
    """
    users = crud.get_all_users(db)

    for user in users:
        if not user.is_active:
            continue

        initial_tokens = get_initial_tokens(user.role)
        delta = initial_tokens - user.token_balance

        if delta == 0:
            continue

        if delta > 0:
            crud.update_user_token_balance(db, user.id, delta)

            crud.create_transaction(
                db,
                user_id=user.id,
                type=TransactionType.GRANT,
                amount=delta,
                balance_after=user.token_balance,
                description="Monthly reset",
            )

    return True

import csv
import io

def bulk_create_users(db: Session, file_content: str):
    """
    Parses a CSV string to bulk create users.
    Expected headers: full_name, email, password, role
    """
    reader = csv.DictReader(io.StringIO(file_content))
    created_count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2): # 1-indexed, header is row 1
        full_name = row.get("full_name", "").strip()
        email = row.get("email", "").strip()
        password = row.get("password", "").strip()
        role = row.get("role", "").strip()

        if not (full_name and email and password and role):
            errors.append(f"Row {row_idx}: Missing required fields.")
            continue

        existing = crud.get_user_by_email(db, email)
        if existing:
            errors.append(f"Row {row_idx}: Email '{email}' already exists.")
            continue
        
        try:
            # We mock the schema expected by crud.create_user. It expects a Pydantic model with these fields.
            class UserCreateData:
                def __init__(self, full_name, email, role):
                    self.full_name = full_name
                    self.email = email
                    self.role = role
            
            user_data = UserCreateData(full_name=full_name, email=email, role=role)
            hashed = hash_password(password)
            initial_tokens = get_initial_tokens(role)

            user = crud.create_user(db, user_data, hashed_password=hashed, token_balance=initial_tokens)

            crud.create_transaction(
                db,
                user_id=user.id,
                type=TransactionType.GRANT,
                amount=initial_tokens,
                balance_after=user.token_balance,
                booking_id=None,
                description="Initial grant (Bulk Upload)"
            )
            created_count += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: Failed to create user. Error: {str(e)}")

    return {"created_count": created_count, "errors": errors}
