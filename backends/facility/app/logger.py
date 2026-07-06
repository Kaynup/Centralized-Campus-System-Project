import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.db import models


logger = logging.getLogger("facility")
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter(
    "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)


def log_action(
    db: Session,
    user_id: str,
    action_type: str,
    description: str,
    facility_id: int = None,
    booking_id: int = None,
    approval_id: int = None,
):
    """
    Insert a log entry into system_logs table.
    - user_id: UUID from centralized users table
    - action_type: e.g. BOOKING_CREATED, BOOKING_CANCELLED, APPROVAL_GRANTED
    - description: human-readable message
    - facility_id, booking_id, approval_id: optional references
    """

    log_entry = models.SystemLog(
        user_id=user_id,          
        action_type=action_type,
        description=description[:255],
        facility_id=facility_id,
        booking_id=booking_id,
        approval_id=approval_id,
        created_at=datetime.utcnow(),
    )

    db.add(log_entry)
    db.commit()
    logger.info(f"[{action_type}] {description} (user={user_id})")


