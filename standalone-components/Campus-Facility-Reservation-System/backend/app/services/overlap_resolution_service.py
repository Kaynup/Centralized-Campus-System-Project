"""
app/services/overlap_resolution_service.py
──────────────────────────────────────────
Logic for resolving geometrical overlaps between a newly confirmed 
booking and existing pending requests.
"""

import uuid
from sqlalchemy.orm import Session
from app.db import crud
from app.db.models import BookingStatus, TransactionType, Booking, ActionReason, Notification

def resolve_overlapping_pending_bookings(db: Session, reserved_booking: Booking):
    """
    Finds all PENDING bookings that overlap with reserved_booking and either
    deducts their slots (partial refund) or drops them entirely if split/swallowed.
    """
    overlapping_pending = (
        db.query(Booking)
        .filter(
            Booking.facility_id == reserved_booking.facility_id,
            Booking.booking_date == reserved_booking.booking_date,
            Booking.status == BookingStatus.PENDING,
            Booking.start_slot_id <= reserved_booking.end_slot_id,
            Booking.end_slot_id >= reserved_booking.start_slot_id,
            Booking.id != reserved_booking.id
        )
        .all()
    )

    facility = crud.get_facility_by_id(db, reserved_booking.facility_id)

    for p in overlapping_pending:
        # P is [p.start_slot_id, p.end_slot_id]
        # R is [reserved_booking.start_slot_id, reserved_booking.end_slot_id]
        
        # 1. P is split in two by R (R strictly inside P)
        if p.start_slot_id < reserved_booking.start_slot_id and p.end_slot_id > reserved_booking.end_slot_id:
            reject_booking_fully(db, p, "Slot split into disconnected parts by another confirmed booking.")
            continue
            
        # 2. R completely swallows P (P strictly inside or equal to R)
        if p.start_slot_id >= reserved_booking.start_slot_id and p.end_slot_id <= reserved_booking.end_slot_id:
            reject_booking_fully(db, p, "Slot fully claimed by another confirmed booking.")
            continue
            
        # 3. R overlaps the END of P
        if p.start_slot_id < reserved_booking.start_slot_id and p.end_slot_id <= reserved_booking.end_slot_id:
            reduce_booking(db, p, facility, p.start_slot_id, reserved_booking.start_slot_id - 1)
            continue
            
        # 4. R overlaps the START of P
        if p.start_slot_id >= reserved_booking.start_slot_id and p.end_slot_id > reserved_booking.end_slot_id:
            reduce_booking(db, p, facility, reserved_booking.end_slot_id + 1, p.end_slot_id)
            continue

def reject_booking_fully(db: Session, p_booking: Booking, reason_text: str):
    action_reason = ActionReason(
        action_label=f"CUSTOM_AR_{uuid.uuid4().hex[:8]}",
        reason_statement=reason_text
    )
    db.add(action_reason)
    db.flush()
    
    crud.update_booking_status(db, p_booking.id, BookingStatus.REJECTED, reason_id=action_reason.id, commit=False)
    
    if p_booking.deposit_paid > 0:
        p_user = crud.update_user_token_balance(db, p_booking.user_id, p_booking.deposit_paid, commit=False)
        crud.create_transaction(
            db, 
            user_id=p_booking.user_id, 
            type=TransactionType.REFUND,
            amount=p_booking.deposit_paid, 
            balance_after=p_user.token_balance,
            booking_id=p_booking.id, 
            description=f"Refund: {reason_text}",
            commit=False,
        )
        
    crud.create_system_log(
        db, 
        level="INFO", 
        action="BOOKING_AUTO_REJECTED", 
        user_id=p_booking.user_id, 
        message=f"Booking {p_booking.id} auto-rejected: {reason_text}",
        commit=False
    )
    
    notification = Notification(
        user_id=p_booking.user_id,
        type="BOOKING_REJECTED",
        title="Pending Request Rejected",
        message=f"Your pending request on {p_booking.booking_date} was rejected. {reason_text}",
        booking_id=p_booking.id
    )
    db.add(notification)


def reduce_booking(db: Session, p_booking: Booking, facility, new_start: int, new_end: int):
    old_num_slots = (p_booking.end_slot_id - p_booking.start_slot_id) + 1
    new_num_slots = (new_end - new_start) + 1
    diff_slots = old_num_slots - new_num_slots
    
    refund = round(diff_slots * (facility.token_cost_per_hour / 6.0), 2)
    
    # Update booking duration and deposit cost
    p_booking.start_slot_id = new_start
    p_booking.end_slot_id = new_end
    p_booking.deposit_paid = round(p_booking.deposit_paid - refund, 2)
    
    # Create action reason for audit history
    action_reason = ActionReason(
        action_label=f"CUSTOM_RED_{uuid.uuid4().hex[:8]}",
        reason_statement=f"Partially reduced. Refunded {refund} tokens."
    )
    db.add(action_reason)
    db.flush()
    
    if refund > 0:
        p_user = crud.update_user_token_balance(db, p_booking.user_id, refund, commit=False)
        crud.create_transaction(
            db, 
            user_id=p_booking.user_id, 
            type=TransactionType.REFUND,
            amount=refund, 
            balance_after=p_user.token_balance,
            booking_id=p_booking.id, 
            description="Partial refund for slot deduction",
            commit=False,
        )
        
    # Inform user about the modification
    notification = Notification(
        user_id=p_booking.user_id,
        type="BOOKING_REDUCED",
        title="Pending Request Partially Reduced",
        message=f"Your pending request for {facility.name} on {p_booking.booking_date} was reduced due to another confirmed booking. It is now from slot {new_start} to {new_end}. {refund} tokens have been refunded.",
        booking_id=p_booking.id
    )
    db.add(notification)
    
    crud.create_system_log(
        db, 
        level="INFO", 
        action="BOOKING_REDUCED", 
        user_id=p_booking.user_id, 
        message=f"Booking {p_booking.id} dynamically reduced. {refund} tokens refunded.",
        commit=False
    )
