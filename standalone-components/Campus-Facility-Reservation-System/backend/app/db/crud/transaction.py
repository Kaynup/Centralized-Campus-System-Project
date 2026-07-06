from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Transaction, TransactionType

def create_transaction(
    db: Session,
    user_id: int,
    type: TransactionType,
    amount: float,
    balance_after: float,
    booking_id: Optional[int] = None,
    description: Optional[str] = None,
    commit: bool = True,
) -> Transaction:
    
    transaction = Transaction(
        user_id=user_id,
        booking_id=booking_id,
        type=type,
        amount=amount,
        balance_after=balance_after,
        description=description
    )

    db.add(transaction)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(transaction)

    return transaction


def get_transactions_by_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
) -> List[Transaction]:
    
    return (
        db.query(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_at.desc())
        .offset(skip)
        .limit(limit).all()
    )
