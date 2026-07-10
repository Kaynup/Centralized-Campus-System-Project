from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from decimal import Decimal
from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"]
)

class TopupRequest(BaseModel):
    amount: Decimal = Field(..., gt=Decimal('0.00'), max_digits=12, decimal_places=2)

@router.get(
    "/balance",
    response_model=schemas.WalletResponse,
    summary="Get wallet details for the authenticated user"
)
def get_balance(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not hasattr(current_user, 'wallet') or not current_user.wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found for this user."
        )
    return current_user.wallet

@router.post(
    "/topup",
    response_model=schemas.TransactionResponse,
    summary="Topup wallet token balance"
)
def topup_wallet(
    payload: TopupRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = getattr(current_user, 'wallet', None)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found for this user."
        )
        
    # Update balance
    wallet.token_balance += payload.amount
    
    # Create transaction log
    transaction = models.Transaction(
        user_id=current_user.id,
        reference_type=models.ReferenceType.manual_adjustment,
        reference_id=None,
        transaction_type=models.TransactionType.token_topup,
        token_amount=payload.amount,
        token_balance_after=wallet.token_balance,
        description=f"Topup of {payload.amount} tokens"
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction

@router.get(
    "/history",
    response_model=list[schemas.TransactionResponse],
    summary="Get user's wallet transaction ledger history"
)
def get_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).order_by(models.Transaction.created_at.desc()).all()
    
    return transactions
