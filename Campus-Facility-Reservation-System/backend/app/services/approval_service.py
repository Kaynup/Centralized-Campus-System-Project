"""
app/services/approval_service.py
──────────────────────────────────
Approval workflow business logic.
"""

from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import Approval, ApprovalStatus, TransactionType, BookingStatus
from app.utils.email_notifications import notify_approval_result
from app.services.overlap_resolution_service import resolve_overlapping_pending_bookings

def request_approval(db: Session, booking_id: int):
    """Create an approval record and set the booking status to PENDING."""
    booking = crud.get_booking_by_id(db, booking_id)
    if booking is None:
        raise ValueError("Booking not found")

    with db.begin_nested():
        approval = crud.create_approval_request(db, booking_id, commit=False)
        crud.update_booking_status(db, booking_id, BookingStatus.PENDING, commit=False)
        crud.create_system_log(
            db,
            level="INFO",
            action="APPROVAL_REQUESTED",
            message=f"Approval requested for booking {booking_id}",
            user_id=booking.user_id,
            booking_id=booking_id,
            commit=False,
        )

    db.commit()
    return approval


def get_pending_approvals(db: Session):
    return crud.get_pending_approvals(db)


def action_approval(db: Session, approval_id: int, approver_id: int, approve: bool, notes_id: int = None):
    """Approve or reject a pending booking."""
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise ValueError("Approval not found")

    if approval.status != ApprovalStatus.PENDING:
        raise ValueError("Approval request has already been actioned")

    booking = crud.get_booking_by_id(db, approval.booking_id)
    if booking is None:
        raise ValueError("Associated booking not found")

    if approve:
        # Check overlap first
        is_overlapping = crud.check_overlap(
            db, 
            booking.facility_id, 
            booking.booking_date, 
            booking.start_slot_id, 
            booking.end_slot_id
        )
        
        if is_overlapping:
            with db.begin_nested():
                approval = crud.action_approval(
                    db,
                    approval_id,
                    approver_id,
                    ApprovalStatus.REJECTED,
                    notes_id=notes_id,
                    commit=False,
                )
                crud.update_booking_status(
                    db,
                    booking.id,
                    BookingStatus.REJECTED,
                    reason_id=notes_id,
                    commit=False,
                )
                if booking.deposit_paid > 0:
                    user = crud.update_user_token_balance(
                        db,
                        booking.user_id,
                        booking.deposit_paid,
                        commit=False,
                    )
                    crud.create_transaction(
                        db,
                        user_id=booking.user_id,
                        type=TransactionType.REFUND,
                        amount=booking.deposit_paid,
                        balance_after=user.token_balance,
                        booking_id=booking.id,
                        description="Refund due to approval conflict",
                        commit=False,
                    )
                crud.create_system_log(
                    db,
                    level="WARNING",
                    action="APPROVAL_REJECTED",
                    message=f"Approval {approval_id} rejected because time slot was taken before action.",
                    user_id=booking.user_id,
                    booking_id=booking.id,
                    commit=False,
                )
            
            booking_user = crud.get_user_by_id(db, booking.user_id)
            if booking_user:
                if booking_user.pref_email_notifications:
                    notify_approval_result(booking_user.email, booking.id, False)
                if booking_user.pref_inapp_notifications:
                    crud.create_notification(db, user_id=booking_user.id, type="approval_rejected", title="Booking Rejected", message=f"Your booking for {booking.facility.name} was rejected because the slot was taken.", commit=False)
                    
            db.commit()
            return approval

        # If it's valid to approve
        with db.begin_nested():
            approval = crud.action_approval(
                db,
                approval_id,
                approver_id,
                ApprovalStatus.APPROVED,
                notes_id=notes_id,
                commit=False,
            )
            crud.update_booking_status(
                db,
                booking.id,
                BookingStatus.RESERVED,
                commit=False,
            )
            crud.create_system_log(
                db,
                level="INFO",
                action="APPROVAL_GRANTED",
                message=f"Approval {approval_id} granted; booking {booking.id} reserved.",
                user_id=booking.user_id,
                booking_id=booking.id,
                commit=False,
            )
            
            # Resolve overlapping pending requests by smartly deducting or dropping them
            resolve_overlapping_pending_bookings(db, booking)
            
        booking_user = crud.get_user_by_id(db, booking.user_id)
        if booking_user:
            if booking_user.pref_email_notifications:
                notify_approval_result(booking_user.email, booking.id, True)
            if booking_user.pref_inapp_notifications:
                crud.create_notification(db, user_id=booking_user.id, type="approval_granted", title="Booking Approved", message=f"Your booking for {booking.facility.name} on {booking.booking_date} was approved.", commit=False)

        db.commit()
        return approval

    else:
        # Rejection
        with db.begin_nested():
            approval = crud.action_approval(
                db,
                approval_id,
                approver_id,
                ApprovalStatus.REJECTED,
                notes_id=notes_id,
                commit=False,
            )
            crud.update_booking_status(
                db,
                booking.id,
                BookingStatus.REJECTED,
                reason_id=notes_id,
                commit=False,
            )
            if booking.deposit_paid > 0:
                user = crud.update_user_token_balance(
                    db,
                    booking.user_id,
                    booking.deposit_paid,
                    commit=False,
                )
                crud.create_transaction(
                    db,
                    user_id=booking.user_id,
                    type=TransactionType.REFUND,
                    amount=booking.deposit_paid,
                    balance_after=user.token_balance,
                    booking_id=booking.id,
                    description="Refund for rejected approval",
                    commit=False,
                )
            crud.create_system_log(
                db,
                level="INFO",
                action="APPROVAL_REJECTED",
                message=f"Approval {approval_id} rejected for booking {booking.id}.",
                user_id=booking.user_id,
                booking_id=booking.id,
                commit=False,
            )

        booking_user = crud.get_user_by_id(db, booking.user_id)
        if booking_user:
            if booking_user.pref_email_notifications:
                notify_approval_result(booking_user.email, booking.id, False)
            if booking_user.pref_inapp_notifications:
                crud.create_notification(db, user_id=booking_user.id, type="approval_rejected", title="Booking Rejected", message=f"Your booking for {booking.facility.name} on {booking.booking_date} was rejected.", commit=False)

        db.commit()
        return approval
