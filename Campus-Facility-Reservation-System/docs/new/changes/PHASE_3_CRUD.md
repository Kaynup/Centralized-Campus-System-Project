# Phase 3: Database CRUD Operations Documentation

## 1. `app/db/crud/slot.py`
- **Removed**: Completely removed `bulk_create_slots`, `get_slots_for_facility`, `get_available_slots`, `mark_slot_unavailable`, and `mark_slot_available`.
- **Added**: `seed_static_slots(db)`. This is a highly efficient, idempotent initialization function. If the database has less than 60 slots, it automatically generates the `start_time_of_day` and `end_time_of_day` blocks from 07:00 to 17:00 in 10-minute intervals.
- **Reason**: Slots are no longer queried per facility per date. They are queried once globally to build the frontend grid.

## 2. `app/db/crud/booking.py`
- **Removed**: `get_active_bookings_for_slot`.
- **Added**: `get_active_bookings_for_date`. This returns all bookings for a facility on a specific date, allowing the frontend to overlay the reservation blocks onto the static slot grid.
- **Rewritten**: `check_overlap`. Instead of looping over slots, it now uses standard SQL interval math: `NewStart <= ExistingEnd AND NewEnd >= ExistingStart` using the `start_slot_id` and `end_slot_id` bounds.
- **Rewritten**: `count_active_reservations`. Because contiguous slots are now natively grouped into a single `Booking` row, we completely deleted the complex merging loop. It now just calls a lightning-fast SQL `.count()`.
- **Rewritten**: `create_booking`. Now takes the unified payload (`facility_id`, `booking_date`, `start_slot_id`, `end_slot_id`).

## 3. `app/db/crud/transaction.py`
- **Updated**: Changed queries to use `.order_by(Transaction.transaction_at.desc())` instead of `created_at`.
- **Updated**: Fixed typing constraints to ensure `amount` and `balance_after` are handled as `float` (not `int`), matching the schema updates.

## 4. `app/db/crud/approval.py`
- **Updated**: Fixed `joinedload` relationships to eagerly load `Booking.facility`, `Booking.start_slot`, and `Booking.end_slot` instead of the deprecated singular `slot`.
- **Updated**: Parameter mapping for `notes_id` instead of `reason_id`.
