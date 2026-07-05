from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.get(
    "/",
    response_model=list[schemas.NotificationResponse],
    summary="Get all notifications for the authenticated user"
)
def get_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    return notifications

@router.patch(
    "/{id}/read",
    response_model=schemas.NotificationResponse,
    summary="Mark a notification as read"
)
def mark_notification_read(
    id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == id,
        models.Notification.recipient_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied."
        )
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@router.patch(
    "/read-all",
    summary="Mark all notifications as read for the authenticated user"
)
def mark_all_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.is_read == False
    ).update({models.Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"success": True}

@router.delete(
    "/read",
    summary="Delete all read notifications for the authenticated user"
)
def delete_read_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.is_read == True
    ).delete(synchronize_session=False)
    db.commit()
    return {"success": True}

