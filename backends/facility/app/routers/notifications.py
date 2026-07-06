from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import db, schemas
from app.core.security import get_current_user
from app.db import models

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=List[schemas.NotificationOut],
    response_model_by_alias=True,
    summary="List notifications"
)
def list_notifications(
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
    try:
        return db_session.query(models.Notification).filter(
            models.Notification.user_id == current_user.id
        ).all()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{notification_id}/read",
    response_model=schemas.NotificationOut,
    response_model_by_alias=True,
    summary="Mark notification as read"
)
def mark_notification_read(
    notification_id: int,
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
   
    notification = db_session.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db_session.commit()
    db_session.refresh(notification)
    return notification


@router.post(
    "/read-all",
    response_model=dict,
    summary="Mark all notifications as read"
)
def mark_all_notifications_read(
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
   
    count = db_session.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db_session.commit()
    return {"updated": count}


@router.delete(
    "/clear-read",
    response_model=dict,
    summary="Clear all read notifications"
)
def clear_read_notifications(
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
    
    count = db_session.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == True
    ).delete()
    db_session.commit()
    return {"deleted": count}
