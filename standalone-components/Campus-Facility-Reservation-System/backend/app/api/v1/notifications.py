"""
app/api/v1/notifications.py
──────────────────────────
User notification endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import NotificationOut
from app.core.security import get_current_user
from app.db import crud

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut], response_model_by_alias=True)
def list_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return crud.get_notifications_for_user(db, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{notification_id}/read", response_model=NotificationOut, response_model_by_alias=True)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return crud.mark_notification_read(db, notification_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/read-all", response_model=dict)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        count = crud.mark_all_notifications_read(db, current_user.id)
        return {"updated": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/clear-read", response_model=dict)
def clear_read_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        count = crud.clear_read_notifications(db, current_user.id)
        return {"deleted": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
