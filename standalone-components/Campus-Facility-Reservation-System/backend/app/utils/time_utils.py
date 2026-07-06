"""
app/utils/time_utils.py
────────────────────────
Date/time helpers for booking and cancellation logic.
TODO (Phase 11): Implement all functions and write unit tests.
"""

from datetime import datetime, date, time, timedelta, timezone
from typing import List


def hours_until_start(start_time: datetime) -> float:
    """
    Return the number of hours between now (UTC) and start_time.
    Returns a negative float if start_time is in the past.
    TODO (Phase 11)
    """
    now = None

    if start_time.tzinfo is None:
        now = datetime.utcnow()
    else:
        now = datetime.now(timezone.utc)

    delta = start_time - now
    return delta.total_seconds() / 3600.0


def calculate_refund_percentage(start_time: datetime) -> int:
    """
    Return the refund percentage based on how far in the future the slot is:
      > 24 hours  → 100
      12–24 hours → 50
      < 12 hours  → 0
    TODO (Phase 11)
    """
    hours = hours_until_start(start_time)

    if hours <= 0:
        return 0
    if hours > 24:
        return 100
    if 12 <= hours <= 24:
        return 50
    return 0


def calculate_penalty_percentage(start_time: datetime) -> int:
    """
    Return 100 - calculate_refund_percentage(start_time).
    TODO (Phase 11)
    """
    return 100 - calculate_refund_percentage(start_time)


def generate_day_slots(
    facility_id: int,
    target_date: date,
    interval_minutes: int = 30,
) -> List[dict]:
    """
    Generate slot dicts for a full operating day (07:00–17:00) with the given
    interval.  Used by the seed script and bulk_create_slots CRUD function.

    Returns a list of dicts:
        [{"facility_id": ..., "start_time": ..., "end_time": ...}, ...]
    TODO (Phase 11)
    """
    slots: List[dict] = []

    start_dt = datetime.combine(target_date, time(7, 0))
    end_of_day = datetime.combine(target_date, time(17, 0))

    current = start_dt

    while current < end_of_day:
        slot_end = current + timedelta(minutes=interval_minutes)

        slots.append(
            {
                "facility_id": facility_id,
                "start_time": current,
                "end_time": slot_end,
            }
        )

        current = slot_end

    return slots
