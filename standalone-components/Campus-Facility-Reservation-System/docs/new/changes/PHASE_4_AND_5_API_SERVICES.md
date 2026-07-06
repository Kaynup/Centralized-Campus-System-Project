# Phase 4 & 5: API Layer and Services Documentation

## 1. `app/services/booking_service.py`
- **Rewritten `create_booking`**: Completely dropped the old `target_slots` locking array loop.
- **New Logic**:
  - Calculates the fractional duration directly (`(end_slot_id - start_slot_id + 1) * 10 / 60`).
  - Calculates deposit amount precisely as a float.
  - Calls `crud.check_overlap` using fast SQL arithmetic.
  - Inserts exactly one `Booking` block.
  - Inserts exactly one `SystemLog`.

## 2. `app/services/cancellation_service.py`
- **Rewritten `_calculate_cancellation_preview`**: Dynamically combines the `booking_date` and the static `start_slot.start_time_of_day` into an absolute, timezone-aware `datetime` object to accurately compute refund and penalty percentages.
- **Rewritten `execute_cancellation`**: No longer flips `is_available` booleans on slots since slots are static. It simply sets `booking.status = BookingStatus.CANCELLED`.
- **Reason IDs**: Plumbed `reason_id` through the entire cancellation flow so the frontend can send a standardized cancellation dictionary ID rather than creating arbitrary strings.

## 3. `app/services/approval_service.py`
- **Rewritten `action_approval`**: Now utilizes the dynamic `crud.check_overlap` check precisely at the moment of approval. If a student's pending request overlaps with a newly reserved block, the admin's approval dynamically rejects the request and automatically refunds the student.

## 4. `app/services/facility_service.py`
- **Rewritten `get_slots_for_date`**: This is the engine of the frontend view. It fetches the 60 static grid rows from the DB, then loops through `active_bookings`. If `b.start_slot_id <= slot.id <= b.end_slot_id`, it paints that block onto the grid and assigns the `status` (`PENDING`, `RESERVED`, or `MY_BOOKING`).

## 5. `app/api/v1/bookings.py`
- **Updated `create_booking`**: Validates the new Pydantic `BookingCreate` schema and delegates directly to the service.
- **Updated `list_bookings`**: Formats the string fields by navigating the new SQLAlchemy relationships (`b.start_slot.start_time_of_day`, `b.facility.name`).

## 6. `app/utils/role_helpers.py`
- **Hierarchical Implementation**: `needs_approval` now respects the `Facility.requires_approval` integer (0 = None, 1 = Student, 2 = Student+Professor). Admins bypass entirely.
- **Removed**: `allowed_roles` checks have been entirely stripped out to respect the new unified access architecture.
