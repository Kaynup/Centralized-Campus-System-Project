from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.db.models import Approval, ApprovalStatus, Booking, BookingStatus, Slot

def create_approval_request(db: Session, booking_id: int, commit: bool = True) -> Approval:
    approval = Approval(
        booking_id=booking_id
    )

    db.add(approval)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(approval)

    return approval


def get_pending_approvals(db: Session) -> List[Approval]:
    return (
        db.query(Approval)
        .join(Booking, Approval.booking_id == Booking.id)
        .options(
            joinedload(Approval.booking).joinedload(Booking.facility),
            joinedload(Approval.booking).joinedload(Booking.start_slot),
            joinedload(Approval.booking).joinedload(Booking.end_slot),
            joinedload(Approval.booking).joinedload(Booking.user),
        )
        .filter(Approval.status == ApprovalStatus.PENDING)
        .filter(Booking.status == BookingStatus.PENDING)
        .all()
    )


def get_approval_by_booking(db: Session, booking_id: int) -> Optional[Approval]:
    approval = (
        db.query(Approval)
        .filter(Approval.booking_id == booking_id)
        .first()
    )
    return approval


def action_approval(
    db: Session,
    approval_id: int,
    approver_id: int,
    status: str,
    notes_id: Optional[int] = None,
    commit: bool = True,
) -> Approval:
    
    approval = db.get(Approval , approval_id)

    if approval is None:
        raise ValueError("Approval not found")

    approval.approver_id = approver_id
    approval.status = ApprovalStatus(status)
    approval.notes_id = notes_id
    approval.actioned_at = datetime.now()

    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(approval)

    return approval
