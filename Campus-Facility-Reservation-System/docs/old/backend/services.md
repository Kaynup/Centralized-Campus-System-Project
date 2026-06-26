# Backend Services Code Documentation

This document provides a detailed code-level breakdown of the core backend business services.

---

## 1. Booking Service (`booking_service.py`)

The booking service manages reservation lifecycles, user validations, double-booking prevention, and token deposits.

### Token Deposit Calculation
When booking a facility, tokens are deducted based on the duration of the slot:
```python
total_seconds = (end_time - start_time).total_seconds()
total_hours = total_seconds / 3600.0
duration_hours = max(0.5, total_hours)
deposit = max(1, int(round(facility.token_cost_per_hour * duration_hours)))
```

### Overlapping Booking Validation (Double-booking check)
The system prevents a user from making overlapping reservations in a single slot window:
```python
def check_no_overlapping_booking(db: Session, user_id: int, start_time, end_time):
    overlapping = (
        db.query(Booking)
        .filter(
            Booking.user_id == user_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.RESERVED]),
            Booking.slot.has(
                and_(
                    Slot.start_time < end_time,
                    Slot.end_time > start_time,
                )
            ),
        )
        .count()
    )
    if overlapping:
        raise SlotUnavailableError(message="You already have a booking in this time window.")
```

---

## 2. Cancellation Service (`cancellation_service.py`)

Handles time-based refunds, penalties, and db status synchronization.

### Preview and Executing Calculations
The refund is calculated dynamically based on hours remaining:
```python
def _calculate_cancellation_preview(booking, slot):
    now = datetime.now(timezone.utc)
    slot_start = slot.start_time
    if slot_start.tzinfo is None:
        slot_start = slot_start.replace(tzinfo=timezone.utc)
    if slot_start <= now:
        raise CancellationNotAllowedError(booking.id, "Booking has already started")

    refund_pct = calculate_refund_percentage(slot.start_time)
    penalty_pct = calculate_penalty_percentage(slot.start_time)
    refund_amount = int((booking.deposit_paid * refund_pct) / 100)
    penalty_amount = booking.deposit_paid - refund_amount
    hours_until_start = max(0.0, (slot_start - now).total_seconds() / 3600)

    return {
        "refund_amount": refund_amount,
        "penalty_amount": penalty_amount,
        "refund_pct": refund_pct,
        "penalty_pct": penalty_pct,
        "deposit_paid": booking.deposit_paid,
        "hours_until_start": round(hours_until_start, 2),
    }
```

### Executing Cancellation inside Nested Transactions
```python
with db.begin_nested():
    crud.update_booking_status(db, booking.id, BookingStatus.CANCELLED, reason=reason, commit=False)

    if was_reserved:
        crud.mark_slot_available(db, slot.id, commit=False)

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
```

---

## 3. Time Calculations (`time_utils.py`)

Handles interval conversion and refund thresholds:
```python
def hours_until_start(start_time: datetime) -> float:
    if start_time.tzinfo is None:
        now = datetime.utcnow()
    else:
        now = datetime.now(timezone.utc)

    delta = start_time - now
    return delta.total_seconds() / 3600.0

def calculate_refund_percentage(start_time: datetime) -> int:
    hours = hours_until_start(start_time)
    if hours <= 0:
        return 0
    if hours > 24:
        return 100
    if 12 <= hours <= 24:
        return 50
    return 0
```

---

## 4. User Service (`user_service.py`)

Handles account operations, specifically bulk uploading users from a CSV file (Admin feature).

### Bulk User Creation
Reads an uploaded CSV file string, parses rows via `csv.DictReader`, and inserts users atomically alongside their initial token grants. It skips malformed or duplicate rows to ensure partial success doesn't fail the entire file.
```python
def bulk_create_users(db: Session, file_content: str):
    reader = csv.DictReader(io.StringIO(file_content))
    created_count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        # Parses full_name, email, password, role
        # Skips missing fields and duplicate emails
        # ...
        user = crud.create_user(db, user_data, hashed_password=hashed, token_balance=50)
        crud.create_transaction(db, user_id=user.id, type=TransactionType.GRANT, amount=50, ...)
```
