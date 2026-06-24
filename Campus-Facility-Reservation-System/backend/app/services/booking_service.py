"""
app/services/booking_service.py
────────────────────────────────
Booking creation and lifecycle business logic.
"""

from datetime import date
import uuid

from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import BookingStatus, TransactionType, Booking, ActionReason, FacilityGroup, Facility
from app.utils import role_helpers

from app.utils.exceptions import (
  SlotUnavailableError,
  InsufficientTokensError,
  UnauthorizedFacilityAccessError,
  QuotaExceededError,
  NotFoundError,
  InvalidBookingDurationError,
)
from app.utils.email_notifications import notify_booking_confirmed, notify_approval_required
from app.services.overlap_resolution_service import resolve_overlapping_pending_bookings


def create_booking(
    db: Session,
    user_id: int,
    facility_id: int,
    booking_date: date,
    start_slot_id: int,
    end_slot_id: int,
):
    """
    Creates a single unified reservation block.
    """
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise NotFoundError("User", user_id)

    with db.begin_nested():
        # Lock the facility row to serialize concurrent booking attempts for this facility
        facility = db.query(Facility).filter(Facility.id == facility_id).with_for_update().first()
        if facility is None:
            raise NotFoundError("Facility", facility_id)

        if not role_helpers.can_book_facility(user.role):
            raise UnauthorizedFacilityAccessError(user.role, facility.id)

        max_active = role_helpers.get_max_active_reservations(user.role)
        if max_active is not None:
            current = crud.count_active_reservations(db, user_id)
            if current >= max_active:
                raise QuotaExceededError(user_id, current, max_active)

        # SQL Interval math to prevent overlapping
        if crud.check_overlap(db, facility_id, booking_date, start_slot_id, end_slot_id):
            raise SlotUnavailableError("One or more slots in the requested time block are already reserved.")

        # Calculate duration. Each slot is 10 minutes.
        num_slots = (end_slot_id - start_slot_id) + 1
        
        # Enforce minimum booking duration
        min_slots = 3
        if facility.facility_group in (FacilityGroup.Courts, FacilityGroup.Halls):
            min_slots = 6
        
        if num_slots < min_slots:
            # Backend logs the error (exception handler will log it)
            raise InvalidBookingDurationError(min_slots)
        
        duration_hours = num_slots * (10.0 / 60.0)
        
        # Calculate deposit
        deposit = facility.token_cost_per_hour * duration_hours
        
        # To avoid floating point weirdness, round to 2 decimal places
        deposit = round(deposit, 2)

        if user.token_balance < deposit:
            raise InsufficientTokensError(deposit, user.token_balance)

        # Deduct tokens
        user = crud.update_user_token_balance(db, user_id, -deposit, commit=False)
        crud.create_transaction(
            db,
            user_id=user_id,
            type=TransactionType.DEPOSIT,
            amount=-deposit,
            balance_after=user.token_balance,
            booking_id=None, # Will link it below
            description=f"Booking deposit for facility {facility_id}",
            commit=False,
        )

        needs = role_helpers.needs_approval(user.role, facility.requires_approval)
        initial_status = BookingStatus.PENDING if needs else BookingStatus.RESERVED

        booking = crud.create_booking(
            db=db,
            user_id=user_id,
            facility_id=facility_id,
            booking_date=booking_date,
            start_slot_id=start_slot_id,
            end_slot_id=end_slot_id,
            deposit=deposit,
            status=initial_status,
            commit=False
        )
        db.flush()

        # Now link the transaction to the created booking
        transaction = user.transactions[-1]
        transaction.booking_id = booking.id
        db.flush()

        if needs:
            crud.create_approval_request(db, booking.id, commit=False)
        else:
            # Sweep and smartly deduct/reject any overlapping PENDING bookings
            resolve_overlapping_pending_bookings(db, booking)

        # Audit Log
        crud.create_system_log(
            db,
            level="INFO",
            action="BOOKING_CREATED",
            user_id=user_id,
            booking_id=booking.id,
            message=f"User {user_id} booked facility {facility_id} on {booking_date} (slots {start_slot_id}-{end_slot_id})",
            commit=False
        )

    # Send notifications
    try:
        if needs:
            notify_approval_required(user.email, facility.name, "Pending Admin Approval")
            if user.pref_inapp_notifications:
                crud.create_notification(
                    db,
                    user_id=user.id,
                    type="approval_required",
                    title="Approval Required",
                    message=f"Your booking for {facility.name} on {booking_date} requires admin approval.",
                    booking_id=booking.id,
                    commit=False
                )
        else:
            notify_booking_confirmed(user.email, facility.name, "Reservation Confirmed")
            if user.pref_inapp_notifications:
                crud.create_notification(
                    db,
                    user_id=user.id,
                    type="booking_confirmed",
                    title="Booking Confirmed",
                    message=f"Your booking for {facility.name} on {booking_date} has been confirmed.",
                    booking_id=booking.id,
                    commit=False
                )
        db.commit()
    except Exception as e:
        print(f"Notification error: {e}")
        # We must commit the booking even if notifications fail!
        db.commit()

    return booking