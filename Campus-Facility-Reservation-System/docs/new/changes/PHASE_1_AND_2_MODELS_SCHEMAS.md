# Phase 1 & 2: Models and Schemas Documentation

## 1. Database Models (`app/db/models.py`)

### `Slot`
- **Removed**: `facility_id`, `start_time` (DateTime), `end_time` (DateTime), `is_available` (Boolean), `unavailability_reason_id`.
- **Added**: `start_time_of_day` (Time), `end_time_of_day` (Time), `is_peak_hour` (Boolean).
- **Reason**: Transitioning from a dynamic date-based generation system to a static 60-row daily template grid.

### `Booking`
- **Removed**: `slot_id`.
- **Added**: `facility_id` (Integer), `booking_date` (Date), `start_slot_id` (Integer), `end_slot_id` (Integer), `cancellation_reason_id` (Integer).
- **Reason**: A 3-hour booking no longer creates 6 separate records. It creates exactly 1 unified block encompassing a start and end interval.

### `Facility`
- **Removed**: `allowed_roles`.
- **Modified**: `requires_approval` changed from `Boolean` to `Integer` (0 = None, 1 = Student, 2 = Professor+Student).

### `Transaction`
- **Modified**: `created_at` renamed to `transaction_at` for clarity.

### `Approval`
- **Modified**: `reason_id` renamed to `notes_id` to link correctly to the new dictionary.

### `ActionReason`
- **Removed**: `context` (Enum), `message` (String), `author_id`.
- **Added**: `action_label` (String 100), `reason_statement` (String 255).
- **Reason**: Converted from a duplicated log table into a strict normalization dictionary.

---

## 2. Pydantic Schemas (`app/db/schemas.py`)

All input payloads and output serializations were strictly updated to match the database changes.
- **`BookingCreate`**: Now expects `facility_id`, `booking_date`, `start_slot_id`, and `end_slot_id`. Added an internal `@model_validator` to assert `end_slot_id >= start_slot_id`.
- **`SlotOut`**: Now returns `start_time_of_day`, `end_time_of_day`, and `is_peak_hour`.
- **`FacilityOut`**: `requires_approval` is now an integer.
- **`BookingDetailOut`**: Updated the relationships to return `start_slot` and `end_slot` instead of the singular `slot`.
