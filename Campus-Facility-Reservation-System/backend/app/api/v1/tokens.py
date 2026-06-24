"""
app/api/v1/tokens.py
─────────────────────
Token balance and transaction history endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import TokenBalanceOut, TransactionOut, TokenGrant
from app.core.security import get_current_user, require_admin
from app.services import user_service
from app.db import crud

router = APIRouter(prefix="/tokens", tags=["Tokens"])


@router.get("/balance", response_model=TokenBalanceOut, response_model_by_alias=True, summary="Get token balance for current user", responses={401: {"description": "Unauthorized"}})
def get_balance(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        balance = user_service.get_token_balance(db, current_user.id)
        return balance
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/transactions", response_model=List[TransactionOut], response_model_by_alias=True, summary="List token transactions for current user", responses={401: {"description": "Unauthorized"}})
def list_transactions(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    txs = crud.get_transactions_by_user(db, current_user.id, skip=skip, limit=limit)
    return txs


@router.post("/grant", response_model=dict, status_code=status.HTTP_201_CREATED, response_model_by_alias=True, summary="Grant tokens to a user (admin)", responses={403: {"description": "Admin access required"}})
def grant_tokens(payload: TokenGrant, db: Session = Depends(get_db), admin_user=Depends(require_admin)):
    try:
        user = user_service.admin_grant_tokens(db, admin_user, payload.user_id, payload.amount, payload.reason)
        return {"message": "Tokens granted", "user_id": user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
