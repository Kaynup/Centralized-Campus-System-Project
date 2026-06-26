"""
app/services/facility_service.py
──────────────────────────────────
Facility and slot management business logic.
"""

from sqlalchemy.orm import Session
from datetime import datetime, date

from app.db import crud
from app.db.models import BookingStatus, Unavailability
from app.utils.exceptions import NotFoundError

def get_facilities(db: Session, group: str = None, active_only: bool = True):
    if group:
        return crud.get_facilities_by_group(db, group)
    return crud.get_all_facilities(db, active_only=active_only)

def get_slots_for_date(db: Session, facility_id: int, target_date: date, current_user=None):
    """
    Returns the 60 static slots, enriched with overlapping booking info for the requested date.
    """
    facility = crud.get_facility_by_id(db, facility_id)
    if not facility:
        raise NotFoundError("Facility", facility_id)

    # Fetch the 60 static slots
    all_slots = crud.get_all_slots(db)
    if not all_slots:
        # Auto-seed if they don't exist
        all_slots = crud.seed_static_slots(db)

    # Fetch active bookings for this date
    active_bookings = crud.get_active_bookings_for_date(db, facility_id, target_date)

    # Fetch unavailabilities for this date
    unavailabilities = db.query(Unavailability).filter(
        Unavailability.facility_id == facility_id,
        Unavailability.booking_date == target_date
    ).all()

    results = []
    for slot in all_slots:
        status = 'AVAILABLE'
        booking_id = None
        user_name = None
        
        # Check if any active booking overlaps this slot
        overlapping_bookings = [b for b in active_bookings if b.start_slot_id <= slot.id <= b.end_slot_id]
        
        # Check if any unavailability overlaps this slot
        overlapping_unavailabilities = [u for u in unavailabilities if u.start_slot_id <= slot.id <= u.end_slot_id]

        if overlapping_unavailabilities:
            status = 'UNAVAILABLE'
        elif overlapping_bookings:
            # Check for any RESERVED or ACTIVE
            reserved_booking = next((b for b in overlapping_bookings if b.status != BookingStatus.PENDING), None)
            
            if reserved_booking:
                if current_user and reserved_booking.user_id == current_user.id:
                    status = 'MY_BOOKING'
                else:
                    status = 'RESERVED'
                booking_id = reserved_booking.id
                if reserved_booking.user:
                    user_name = reserved_booking.user.full_name
            else:
                # ONLY PENDING bookings exist
                my_pending = next((b for b in overlapping_bookings if current_user and b.user_id == current_user.id), None)
                if my_pending:
                    status = 'PENDING'
                    booking_id = my_pending.id
                    if my_pending.user:
                        user_name = my_pending.user.full_name
                else:
                    # Someone else's pending requests. Still AVAILABLE to me!
                    status = 'AVAILABLE'

        
        # A single 10-minute slot duration deposit = cost / 6
        deposit = round(facility.token_cost_per_hour / 6.0, 2)
        
        results.append({
            'id': slot.id,
            'start_time_of_day': slot.start_time_of_day,
            'end_time_of_day': slot.end_time_of_day,
            'is_peak_hour': slot.is_peak_hour,
            'status': status,
            'booking_id': booking_id,
            'user_name': user_name,
            'bookingId': booking_id,
            'userName': user_name,
            'deposit': deposit,
        })

    return results

def get_facility_calendar(db: Session, facility_id: int, target_date: date, current_user=None):
    return get_slots_for_date(db, facility_id, target_date, current_user)
