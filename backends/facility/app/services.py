from sqlalchemy.orm import Session
from datetime import date
from app.db import models
from app.utils.exceptions import (
    SlotUnavailableError,
    InsufficientTokensError,
    UnauthorizedFacilityAccessError,
    QuotaExceededError,
    CancellationNotAllowedError,
    NotFoundError,
    SlotInPastError,
    InvalidBookingDurationError,
)


def create_booking(db: Session, user_id: str, facility_id: int, booking_date: date,
                   start_slot_id: int, end_slot_id: int):
    """Create a booking with validation rules."""

    facility = db.query(models.Facility).filter(models.Facility.id == facility_id).first()
    if not facility:
        raise NotFoundError("Facility not found")


    start_slot = db.query(models.Slot).filter(models.Slot.id == start_slot_id).first()
    end_slot = db.query(models.Slot).filter(models.Slot.id == end_slot_id).first()
    if not start_slot or not end_slot:
        raise NotFoundError("Slot not found")

    if start_slot.start_time_of_day >= end_slot.end_time_of_day:
        raise InvalidBookingDurationError("Invalid slot range")

 
    existing = db.query(models.Booking).filter(
        models.Booking.facility_id == facility_id,
        models.Booking.booking_date == booking_date,
        models.Booking.start_slot_id <= end_slot_id,
        models.Booking.end_slot_id >= start_slot_id
    ).first()
    if existing:
        raise SlotUnavailableError("Slot already booked")

    # Create booking
    booking = models.Booking(
        user_id=user_id,
        facility_id=facility_id,
        booking_date=booking_date,
        start_slot_id=start_slot_id,
        end_slot_id=end_slot_id,
        status=models.BookingStatus.PENDING
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def action_approval(db: Session, approval_id: int, approver_id: str, approve: bool, notes_id: int = None):
    """Approve or reject a booking."""
    approval = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not approval:
        raise NotFoundError("Approval not found")

    approval.approver_id = approver_id
    approval.status = models.ApprovalStatus.APPROVED if approve else models.ApprovalStatus.REJECTED
    approval.notes_id = notes_id

    # Update booking status
    booking = approval.booking
    booking.status = models.BookingStatus.ACTIVE if approve else models.BookingStatus.REJECTED

    db.commit()
    db.refresh(approval)
    return approval




def preview_cancellation(db: Session, booking_id: int, user_id: str):
    """Preview refund/penalty before cancellation."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise NotFoundError("Booking not found")
    if booking.user_id != user_id:
        raise UnauthorizedFacilityAccessError("Not allowed to cancel this booking")

   
    hours_until_start = (booking.start_slot.start_time_of_day.hour - date.today().hour)
    refund_pct = 0.5 if hours_until_start > 24 else 0.0
    penalty_pct = 1 - refund_pct

    return {
        "refund_amount": booking.deposit_paid * refund_pct,
        "penalty_amount": booking.deposit_paid * penalty_pct,
        "refund_pct": refund_pct,
        "penalty_pct": penalty_pct,
        "hours_until_start": hours_until_start,
    }


def execute_cancellation(db: Session, booking_id: int, user_id: str, reason_id: int = None):
    """Cancel a booking and apply refund/penalty."""
    preview = preview_cancellation(db, booking_id, user_id)
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    booking.status = models.BookingStatus.CANCELLED
    booking.cancellation_reason_id = reason_id
    db.commit()
    return preview



def get_facilities(db: Session, group: str = None, active_only: bool = True):
    """List facilities with optional filters."""
    query = db.query(models.Facility)
    if group:
        query = query.filter(models.Facility.facility_group == group)
    if active_only:
        query = query.filter(models.Facility.is_active == True)
    return query.all()


def get_slots_for_date(db: Session, facility_id: int, target_date: date, current_user=None):
    """Get slots for a facility on a given date."""
    slots = db.query(models.Slot).filter(
        models.Slot.facility_id == facility_id,
        models.Slot.date == target_date
    ).all()
    return slots
