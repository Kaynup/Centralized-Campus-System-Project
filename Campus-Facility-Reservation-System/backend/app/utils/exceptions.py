"""
app/utils/exceptions.py
────────────────────────
Custom domain exception classes.

These are raised by the service layer and caught by route handlers
(or the global exception handler) to return appropriate HTTP responses.

TODO (Phase 11): Wire these into route handlers and global error handlers.
"""


class SlotUnavailableError(Exception):
    """Raised when a slot has already been taken by another booking."""
    def __init__(self, slot_id: int = None, message: str = None):
        self.slot_id = slot_id
        if message is not None:
            self.message = message
        elif slot_id is not None:
            self.message = f"Slot {slot_id} is no longer available."
        else:
            self.message = "Slot is no longer available."
        super().__init__(self.message)


class NotFoundError(Exception):
    """Raised when a requested resource is not found."""
    def __init__(self, entity: str, entity_id: int):
        self.entity = entity
        self.entity_id = entity_id
        super().__init__(f"{entity} {entity_id} not found.")


class InsufficientTokensError(Exception):
    """Raised when a user's token balance is too low to complete a booking."""
    def __init__(self, required: int, available: int):
        self.required = required
        self.available = available
        super().__init__(
            f"Insufficient tokens: need {required}, have {available}."
        )


class UnauthorizedFacilityAccessError(Exception):
    """Raised when a user's role is not permitted to book a specific facility."""
    def __init__(self, user_role: str, facility_id: int):
        self.user_role = user_role
        self.facility_id = facility_id
        super().__init__(
            f"Role '{user_role}' is not permitted to book facility {facility_id}."
        )


class CancellationNotAllowedError(Exception):
    """Raised when a booking cannot be cancelled (wrong status, past start, etc.)."""
    def __init__(self, booking_id: int, reason: str = ""):
        self.booking_id = booking_id
        super().__init__(
            f"Booking {booking_id} cannot be cancelled. {reason}".strip()
        )


class QuotaExceededError(Exception):
    """Raised when a user has too many active bookings for their role."""
    def __init__(self, user_id: int, current: int, maximum: int):
        self.user_id = user_id
        self.current = current
        self.maximum = maximum
        super().__init__(
            f"Quota reached for active bookings ({current}/{maximum})"
        )


class ApprovalRequiredError(Exception):
    """Raised when a booking must be routed through the approval workflow."""
    def __init__(self, facility_id: int):
        self.facility_id = facility_id
        super().__init__(
            f"Facility {facility_id} requires approval for this booking."
        )


class SlotInPastError(Exception):
    """Raised when a slot is in the past and cannot be booked or cancelled."""
    def __init__(self, slot_id: int, message: str = "Slot time is in the past"):
        self.slot_id = slot_id
        super().__init__(f"Slot {slot_id}: {message}")


class InvalidBookingDurationError(Exception):
    """Raised when a booking duration is less than the minimum required."""
    def __init__(self, min_slots: int):
        self.min_slots = min_slots
        super().__init__(f"Minimum booking duration for this facility is {min_slots * 10} minutes.")
