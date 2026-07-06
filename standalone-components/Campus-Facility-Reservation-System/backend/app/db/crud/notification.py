from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Notification

from datetime import datetime, timedelta

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    booking_id: Optional[int] = None,
    metadata: Optional[dict] = None,
    read: bool = False,
    commit: bool = True,
) -> Notification:
    # Deduplicate recent identical notifications
    time_threshold = datetime.utcnow() - timedelta(seconds=15)
    recent = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == type,
            Notification.title == title,
            Notification.message == message,
            Notification.created_at >= time_threshold
        )
        .first()
    )
    if recent:
        return recent

    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        booking_id=booking_id,
        log_metadata=metadata,
        read=read,
    )
    db.add(notification)
    if commit:
        db.commit()
        db.refresh(notification)
    else:
        db.flush()
    return notification


def get_notifications_for_user(db: Session, user_id: int) -> List[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def mark_notification_read(db: Session, notification_id: int, user_id: int) -> Notification:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notification is None:
        raise ValueError("Notification not found")

    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session, user_id: int) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read == False)
        .update({"read": True})
    )
    db.commit()
    return updated


def clear_read_notifications(db: Session, user_id: int) -> int:
    deleted = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read == True)
        .delete()
    )
    db.commit()
    return deleted
