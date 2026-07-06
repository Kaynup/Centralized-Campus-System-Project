from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import SystemLog

def create_log(
    db: Session,
    level: str,
    action: str,
    message: str,
    user_id: Optional[int] = None,
    booking_id: Optional[int] = None,
    metadata: Optional[dict] = None,
    commit: bool = True,
) -> SystemLog:
    
    log = SystemLog(
        level=level,
        action=action,
        message=message,
        user_id=user_id,
        booking_id=booking_id,
        log_metadata=metadata
    )

    db.add(log)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(log)

    return log


def get_logs(
    db: Session,
    level_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[SystemLog]:
    
    query = db.query(SystemLog)

    if level_filter:
        query = query.filter(
            SystemLog.level == level_filter
        )

    query = (
        query
        .order_by(SystemLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return list(
        db.scalars(query)
    )
