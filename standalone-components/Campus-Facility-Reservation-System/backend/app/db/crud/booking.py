from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.models import Booking, BookingStatus

def get_booking_by_id(db: Session, booking_id: int) -> Optional[Booking]:
    return db.get(Booking, booking_id)

def get_bookings_by_user(
    db: Session,
    user_id: int,
    status_filter: Optional[BookingStatus] = None,
) -> List[Booking]:
    query = db.query(Booking).filter(Booking.user_id == user_id)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    return query.all()

def get_active_bookings_for_date(
    db: Session, facility_id: int, booking_date: date
) -> List[Booking]:
    """Return PENDING or RESERVED bookings for a facility on a specific date."""
    return (
        db.query(Booking)
        .filter(
            Booking.facility_id == facility_id,
            Booking.booking_date == booking_date,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.RESERVED])
        )
        .all()
    )

def check_overlap(
    db: Session,
    facility_id: int,
    booking_date: date,
    start_slot_id: int,
    end_slot_id: int
) -> bool:
    """
    Returns True if the requested interval overlaps with any active bookings.
    Standard SQL interval overlap: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
    Since we use inclusive slot blocks, if end_slot_id is the last slot occupied,
    the logic is NewStart <= ExistingEnd AND NewEnd >= ExistingStart.
    """
    overlapping = (
        db.query(Booking)
        .filter(
            Booking.facility_id == facility_id,
            Booking.booking_date == booking_date,
            Booking.status == BookingStatus.RESERVED,
            Booking.start_slot_id <= end_slot_id,
            Booking.end_slot_id >= start_slot_id
        )
        .with_for_update().first()
    )
    return overlapping is not None

def create_booking(
    db: Session,
    user_id: int,
    facility_id: int,
    booking_date: date,
    start_slot_id: int,
    end_slot_id: int,
    deposit: float,
    status: BookingStatus = BookingStatus.PENDING,
    commit: bool = True,
) -> Booking:
    booking = Booking(
        user_id=user_id,
        facility_id=facility_id,
        booking_date=booking_date,
        start_slot_id=start_slot_id,
        end_slot_id=end_slot_id,
        deposit_paid=deposit,
        status=status
    )
    db.add(booking)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(booking)
    return booking

def update_booking_status(
    db: Session,
    booking_id: int,
    new_status: BookingStatus,
    reason_id: Optional[int] = None,
    commit: bool = True,
) -> Booking:
    booking = get_booking_by_id(db, booking_id)
    if booking is None:
        raise ValueError("Booking not found")

    booking.status = new_status
    if reason_id:
        booking.cancellation_reason_id = reason_id

    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(booking)
    return booking

def count_active_reservations(db: Session, user_id: int) -> int:
    """
    Count PENDING + RESERVED bookings for quota enforcement.
    Because a reservation block is now exactly one row in the bookings table,
    we simply return the count of rows! No more complex contiguous slot merging.
    """
    return (
        db.query(Booking)
        .filter(
            Booking.user_id == user_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.RESERVED])
        )
        .count()
    )
