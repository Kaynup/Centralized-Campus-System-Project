from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_current_user
from envelope import success
import schemas
import services
from db import get_db_connection

router = APIRouter(
    tags=["Transactions"]
)

@router.post(
    "/transactions/purchase",
    response_model=schemas.PurchaseResponse,
    status_code=201,
    summary="Purchase an item — locks tokens in escrow vault"
)
def purchase_item(
    payload: schemas.PurchaseRequest,
    current_user=Depends(get_current_user)
):
    # Security check: Make sure buyer matches authenticated user
    if payload.buyer_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot perform purchase on behalf of another user."
        )
    with get_db_connection() as conn:
        holding = services.purchase_item(conn, payload)
        
    return schemas.PurchaseResponse(
        message="Purchase successful. Tokens locked in vault.",
        holding_record_id=holding["id"],
        item_id=holding["item_id"],
        amount=holding["amount"],
        status=holding["status"]
    )

@router.post(
    "/delivery/confirm/{purchaseId}",
    response_model=schemas.DeliveryConfirmResponse,
    summary="Confirm delivery — releases escrow tokens to seller"
)
def confirm_delivery(
    purchaseId: str,
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        result = services.confirm_delivery(conn, purchaseId, current_user["id"])
    return schemas.DeliveryConfirmResponse(**result)

@router.get(
    "/purchases/me",
    summary="Get all purchases made by the current user"
)
def get_my_purchases(
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        purchases = services.get_my_purchases(conn, current_user)
    return success(purchases)
