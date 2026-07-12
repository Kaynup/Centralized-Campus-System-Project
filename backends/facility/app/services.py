from sqlalchemy.orm import Session
from sqlalchemy import text
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
import os
import uuid

def create_booking(db: Session, user_id: str, facility_id: int, booking_date: date,
                   start_slot_id: int, end_slot_id: int):
    """Create a booking with validation rules and token limits."""

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
        models.Booking.end_slot_id >= start_slot_id,
        models.Booking.status.in_([models.BookingStatus.PENDING, models.BookingStatus.RESERVED, models.BookingStatus.COMPLETED])
    ).first()
    if existing:
        raise SlotUnavailableError("Slot already booked")

    # Calculate tokens required
    duration_hours = (
        end_slot.end_time_of_day.hour - start_slot.start_time_of_day.hour +
        (end_slot.end_time_of_day.minute - start_slot.start_time_of_day.minute) / 60.0
    )
    if duration_hours <= 0:
        raise InvalidBookingDurationError("Invalid slot range")

    deposit_required = float(duration_hours * facility.token_cost_per_hour)
    
    # Check wallet and limits
    MAX_FACILITY_TOKEN_LIMIT = float(os.getenv("MAX_FACILITY_TOKEN_LIMIT", "500.00"))
    
    wallet = db.execute(
        text("SELECT token_balance, reserved_tokens, facility_tokens_used FROM wallets WHERE user_id = :u FOR UPDATE"),
        {"u": user_id}
    ).fetchone()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
        
    wallet_balance = float(wallet[0])
    wallet_reserved = float(wallet[1])
    facility_tokens_used = float(wallet[2])
    
    if wallet_balance < deposit_required:
        raise InsufficientTokensError(deposit_required, wallet_balance)
        
    if facility_tokens_used + deposit_required > MAX_FACILITY_TOKEN_LIMIT:
        raise QuotaExceededError(f"Exceeds max facility token limit of {MAX_FACILITY_TOKEN_LIMIT}. Currently using: {facility_tokens_used}")

    new_balance = wallet_balance - deposit_required
    new_reserved = wallet_reserved + deposit_required
    new_facility_used = facility_tokens_used + deposit_required
    
    db.execute(
        text("UPDATE wallets SET token_balance = :b, reserved_tokens = :r, facility_tokens_used = :f WHERE user_id = :u"),
        {"b": new_balance, "r": new_reserved, "f": new_facility_used, "u": user_id}
    )

    # Create booking
    booking = models.Booking(
        user_id=user_id,
        facility_id=facility_id,
        booking_date=booking_date,
        start_slot_id=start_slot_id,
        end_slot_id=end_slot_id,
        status=models.BookingStatus.PENDING,
        deposit_paid=deposit_required
    )
    db.add(booking)
    db.flush()
    
    db.execute(
        text("""
            INSERT INTO transactions (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
            VALUES (:id, :u, 'booking', :ref, 'deposit_lock', :amt, :after)
        """),
        {
            "id": str(uuid.uuid4()), "u": user_id, "ref": str(booking.id),
            "amt": deposit_required, "after": new_balance
        }
    )
    
    db.commit()
    db.refresh(booking)
    return booking


def action_approval(db: Session, approval_id: int, approver_id: str, approve: bool, notes: str = None):
    """Approve or reject a booking."""
    approval = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not approval:
        raise NotFoundError("Approval not found")

    notes_id = None
    if notes:
        reason = models.ActionReason(
            action_label=f"CUSTOM_NOTE_{uuid.uuid4().hex[:8]}",
            reason_statement=notes[:255]
        )
        db.add(reason)
        db.flush()
        notes_id = reason.id

    approval.approver_id = approver_id
    approval.status = models.ApprovalStatus.APPROVED if approve else models.ApprovalStatus.REJECTED
    approval.notes_id = notes_id

    # Update booking status
    booking = approval.booking
    booking.status = models.BookingStatus.RESERVED if approve else models.BookingStatus.REJECTED

    if not approve:
        # Refund deposit
        user_id = booking.user_id
        deposit_paid = float(booking.deposit_paid or 0.0)
        
        if deposit_paid > 0:
            wallet = db.execute(
                text("SELECT token_balance, reserved_tokens, facility_tokens_used FROM wallets WHERE user_id = :u FOR UPDATE"),
                {"u": user_id}
            ).fetchone()
            
            if wallet:
                wallet_balance = float(wallet[0])
                wallet_reserved = float(wallet[1])
                facility_tokens_used = float(wallet[2])
                
                new_balance = wallet_balance + deposit_paid
                new_reserved = max(0.0, wallet_reserved - deposit_paid)
                new_facility_used = max(0.0, facility_tokens_used - deposit_paid)
                
                db.execute(
                    text("UPDATE wallets SET token_balance = :b, reserved_tokens = :r, facility_tokens_used = :f WHERE user_id = :u"),
                    {"b": new_balance, "r": new_reserved, "f": new_facility_used, "u": user_id}
                )
                
                db.execute(
                    text("""
                        INSERT INTO transactions (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
                        VALUES (:id, :u, 'booking', :ref, 'deposit_unlock', :amt, :after)
                    """),
                    {
                        "id": str(uuid.uuid4()), "u": user_id, "ref": str(booking.id),
                        "amt": deposit_paid, "after": new_balance
                    }
                )

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
        
    deposit_paid = float(booking.deposit_paid or 0.0)

    hours_until_start = (booking.start_slot.start_time_of_day.hour - date.today().hour)
    # Simple logic to determine penalty
    refund_pct = 0.5 if hours_until_start > 24 else 0.0
    if hours_until_start > 48:
        refund_pct = 1.0
        
    penalty_pct = 1 - refund_pct

    return {
        "refund_amount": deposit_paid * refund_pct,
        "penalty_amount": deposit_paid * penalty_pct,
        "refund_pct": refund_pct,
        "penalty_pct": penalty_pct,
        "hours_until_start": hours_until_start,
    }


def execute_cancellation(db: Session, booking_id: int, user_id: str, reason: str = None):
    """Cancel a booking and apply refund/penalty."""
    preview = preview_cancellation(db, booking_id, user_id)
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    
    reason_id = None
    if reason:
        action_reason = models.ActionReason(
            action_label=f"USER_CANCEL_{uuid.uuid4().hex[:8]}",
            reason_statement=reason[:255]
        )
        db.add(action_reason)
        db.flush()
        reason_id = action_reason.id
        
    booking.status = models.BookingStatus.CANCELLED
    booking.cancellation_reason_id = reason_id
    
    refund_amount = preview["refund_amount"]
    penalty_amount = preview["penalty_amount"]
    deposit_paid = float(booking.deposit_paid or 0.0)
    
    if deposit_paid > 0:
        wallet = db.execute(
            text("SELECT token_balance, reserved_tokens, facility_tokens_used FROM wallets WHERE user_id = :u FOR UPDATE"),
            {"u": user_id}
        ).fetchone()
        
        if wallet:
            wallet_balance = float(wallet[0])
            wallet_reserved = float(wallet[1])
            facility_tokens_used = float(wallet[2])
            
            new_balance = wallet_balance + refund_amount
            new_reserved = max(0.0, wallet_reserved - deposit_paid)
            new_facility_used = max(0.0, facility_tokens_used - deposit_paid)
            
            db.execute(
                text("UPDATE wallets SET token_balance = :b, reserved_tokens = :r, facility_tokens_used = :f WHERE user_id = :u"),
                {"b": new_balance, "r": new_reserved, "f": new_facility_used, "u": user_id}
            )
            
            if penalty_amount > 0:
                db.execute(
                    text("""
                        INSERT INTO transactions (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
                        VALUES (:id, :u, 'booking', :ref, 'late_fee_deduction', :amt, :after)
                    """),
                    {
                        "id": str(uuid.uuid4()), "u": user_id, "ref": str(booking.id),
                        "amt": penalty_amount, "after": wallet_balance - penalty_amount
                    }
                )
                
            if refund_amount >= 0:
                db.execute(
                    text("""
                        INSERT INTO transactions (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after)
                        VALUES (:id, :u, 'booking', :ref, 'deposit_unlock', :amt, :after)
                    """),
                    {
                        "id": str(uuid.uuid4()), "u": user_id, "ref": str(booking.id),
                        "amt": refund_amount, "after": new_balance
                    }
                )

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
    all_slots = db.query(models.Slot).order_by(models.Slot.start_time_of_day).all()
    
    bookings = db.query(models.Booking).filter(
        models.Booking.facility_id == facility_id,
        models.Booking.booking_date == target_date,
        models.Booking.status.in_([models.BookingStatus.PENDING, models.BookingStatus.RESERVED, models.BookingStatus.COMPLETED])
    ).all()
    
    unavailabilities = db.query(models.Unavailability).filter(
        models.Unavailability.facility_id == facility_id,
        models.Unavailability.booking_date == target_date
    ).all()
    
    result = []
    for slot in all_slots:
        status = "AVAILABLE"
        booking_id = None
        deposit = None
        
        for unavail in unavailabilities:
            if unavail.start_slot_id <= slot.id <= unavail.end_slot_id:
                status = "MAINTENANCE"
                break
                
        if status == "AVAILABLE":
            for b in bookings:
                if b.start_slot_id <= slot.id <= b.end_slot_id:
                    status = "BOOKED"
                    booking_id = b.id
                    deposit = b.deposit_paid
                    break
                    
        result.append({
            "id": slot.id,
            "start_time_of_day": slot.start_time_of_day,
            "end_time_of_day": slot.end_time_of_day,
            "is_peak_hour": slot.is_peak_hour,
            "status": status,
            "booking_id": booking_id,
            "user_name": None,
            "deposit": deposit
        })
        
    return result
