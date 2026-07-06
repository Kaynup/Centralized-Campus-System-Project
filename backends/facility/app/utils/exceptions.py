from email.mime import message


class SlotUnavailableError(Exception):
    
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
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message)


class InsufficientTokensError(Exception):
    
    def __init__(self, required: int = 0, available: int = 0):
        self.required = required
        self.available = available
        super().__init__(f"Insufficient tokens: need {required}, have {available}.")


class UnauthorizedFacilityAccessError(Exception):
    
    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(message)


class CancellationNotAllowedError(Exception):
    
    def __init__(self, message: str = "Cancellation not allowed"):
        super().__init__(message)


class QuotaExceededError(Exception):
        def __init__(self, message: str = "Quota exceeded"):
            super().__init__(message)


class ApprovalRequiredError(Exception):
    def __init__(self, facility_id: int):
        self.facility_id = facility_id
        super().__init__(f"Facility {facility_id} requires approval for this booking.")


class SlotInPastError(Exception):
    def __init__(self, slot_id: int, message: str = "Slot time is in the past"):
        self.slot_id = slot_id
        super().__init__(f"Slot {slot_id}: {message}")


class InvalidBookingDurationError(Exception):
    def __init__(self, message: str = "Invalid booking duration"):
        super().__init__(message)
