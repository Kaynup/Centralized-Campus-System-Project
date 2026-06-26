"""
app/services/cancellation_service.py
──────────────────────────────────────
Booking cancellation and refund/penalty logic.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db import crud
from app.utils.time_utils import calculate_refund_percentage, calculate_penalty_percentage
from app.db.models import TransactionType, BookingStatus
from app.utils.exceptions import CancellationNotAllowedError, NotFoundError


def _calculate_cancellation_preview(booking):
    now = datetime.now(timezone.utc)
    
    # Combine the date and the time of the start slot
    start_dt = datetime.combine(booking.booking_date, booking.start_slot.start_time_of_day)
    start_dt = start_dt.replace(tzinfo=timezone.utc)
    
    if start_dt <= now:
        raise CancellationNotAllowedError(booking.id, "Booking has already started")

    refund_pct = calculate_refund_percentage(start_dt)
    penalty_pct = calculate_penalty_percentage(start_dt)
    
    refund_amount = round((booking.deposit_paid * refund_pct) / 100, 2)
    penalty_amount = round(booking.deposit_paid - refund_amount, 2)
    
    hours_until_start = max(0.0, (start_dt - now).total_seconds() / 3600)

    return {
        "refund_amount": refund_amount,
        "penalty_amount": penalty_amount,
        "refund_pct": refund_pct,
        "penalty_pct": penalty_pct,
        "deposit_paid": booking.deposit_paid,
        "hours_until_start": round(hours_until_start, 2),
    }

from app.utils.email_notifications import notify_booking_cancelled

def preview_cancellation(db: Session, booking_id: int, user_id: int):
    booking = crud.get_booking_by_id(db, booking_id)
    if booking is None:
        raise NotFoundError("Booking", booking_id)
    if booking.user_id != user_id:
        raise PermissionError("Cannot preview cancellation for another user's booking")
    if booking.status not in (BookingStatus.RESERVED, BookingStatus.PENDING):
        raise CancellationNotAllowedError(booking_id, "Booking cannot be cancelled")

    return _calculate_cancellation_preview(booking)


def execute_cancellation(db: Session, booking_id: int, user_id: int, reason_id: int = None):
    preview = preview_cancellation(db, booking_id, user_id)
    booking = crud.get_booking_by_id(db, booking_id)
    
    refund_amount = preview["refund_amount"]
    penalty_amount = preview["penalty_amount"]

    with db.begin_nested():
        crud.update_booking_status(db, booking.id, BookingStatus.CANCELLED, reason_id=reason_id, commit=False)

        if refund_amount > 0:
            user = crud.update_user_token_balance(db, booking.user_id, refund_amount, commit=False)
            crud.create_transaction(
                db,
                user_id=booking.user_id,
                type=TransactionType.REFUND,
                amount=refund_amount,
                balance_after=user.token_balance,
                booking_id=booking.id,
                description="Refund on cancellation",
                commit=False,
            )

        if penalty_amount > 0:
            crud.create_transaction(
                db,
                user_id=booking.user_id,
                type=TransactionType.PENALTY,
                amount=-penalty_amount,
                balance_after=crud.get_user_by_id(db, booking.user_id).token_balance,
                booking_id=booking.id,
                description="Penalty on cancellation",
                commit=False,
            )

        crud.create_system_log(
            db,
            level="WARNING" if penalty_amount > 0 else "INFO",
            action="CANCELLED_BOOKING",
            message=(f"Booking {booking.id} cancelled. refund={refund_amount} penalty={penalty_amount}"),
            user_id=booking.user_id,
            booking_id=booking.id,
            commit=False,
        )
        
        user = crud.get_user_by_id(db, booking.user_id)
        if user.pref_email_notifications:
            notify_booking_cancelled(user.email, booking.id, refund_amount)
            
        if user.pref_inapp_notifications:
            crud.create_notification(
                db,
                user_id=booking.user_id,
                type="booking_cancelled",
                title="Booking Cancelled",
                message=f"Your booking for {booking.facility.name} on {booking.booking_date} has been cancelled. {refund_amount} tokens refunded.",
                commit=False
            )

    db.commit()
    return preview

def execute_cancellation_as_admin(db: Session, booking_id: int, admin_user_id: int, reason_id: int = None):
    booking = crud.get_booking_by_id(db, booking_id)
    if booking is None:
        raise NotFoundError("Booking", booking_id)
    if booking.status != BookingStatus.RESERVED:
        raise CancellationNotAllowedError(booking_id, "Admin can only force-cancel RESERVED bookings.")

    refund_amount = booking.deposit_paid

    with db.begin_nested():
        crud.update_booking_status(db, booking.id, BookingStatus.CANCELLED, reason_id=reason_id, commit=False)

        if refund_amount > 0:
            user = crud.update_user_token_balance(db, booking.user_id, refund_amount, commit=False)
            crud.create_transaction(
                db,
                user_id=booking.user_id,
                type=TransactionType.REFUND,
                amount=refund_amount,
                balance_after=user.token_balance,
                booking_id=booking.id,
                description="Admin Force Cancellation (100% Refund)",
                commit=False,
            )

            crud.create_notification(
                db,
                user_id=booking.user_id,
                type="booking_cancelled_admin",
                title="Booking Cancelled by Admin",
                message=f"Your booking on {booking.booking_date} was cancelled by an admin. {refund_amount} tokens refunded.",
                commit=False
            )

        crud.create_system_log(
            db,
            level="WARNING",
            action="ADMIN_FORCE_CANCEL",
            message=f"Admin {admin_user_id} force-cancelled booking {booking.id}",
            user_id=admin_user_id,
            booking_id=booking.id,
            commit=False
        )

    db.commit()
    return {"refunded": refund_amount, "booking_id": booking.id}

def handle_no_show(db: Session, booking_id: int):
    booking = crud.get_booking_by_id(db, booking_id)
    if booking is None:
        raise NotFoundError("Booking", booking_id)
    if booking.status != BookingStatus.RESERVED:
        raise ValueError("Only reserved bookings can be marked as no-show")

    now = datetime.now(timezone.utc)
    end_dt = datetime.combine(booking.booking_date, booking.end_slot.end_time_of_day)
    end_dt = end_dt.replace(tzinfo=timezone.utc)
    
    if end_dt > now:
        raise ValueError("Booking has not yet ended")

    with db.begin_nested():
        crud.update_booking_status(db, booking.id, BookingStatus.NO_SHOW, commit=False)
        crud.create_system_log(
            db,
            level="WARNING",
            action="NO_SHOW_DETECTED",
            message=f"Booking {booking.id} marked as no-show.",
            user_id=booking.user_id,
            booking_id=booking.id,
            commit=False,
        )

    db.commit()
    return booking

def handle_completion(db: Session, booking_id: int):
    booking = crud.get_booking_by_id(db, booking_id)
    if booking is None:
        raise NotFoundError("Booking", booking_id)
    if booking.status != BookingStatus.RESERVED:
        raise ValueError("Only reserved bookings can be completed")

    now = datetime.now(timezone.utc)
    end_dt = datetime.combine(booking.booking_date, booking.end_slot.end_time_of_day)
    end_dt = end_dt.replace(tzinfo=timezone.utc)
    
    if end_dt > now:
        raise ValueError("Booking has not yet ended")

    with db.begin_nested():
        crud.update_booking_status(db, booking.id, BookingStatus.COMPLETED, commit=False)
        crud.create_system_log(
            db,
            level="INFO",
            action="BOOKING_COMPLETED",
            message=f"Booking {booking.id} completed successfully.",
            user_id=booking.user_id,
            booking_id=booking.id,
            commit=False,
        )

    db.commit()
    return booking
