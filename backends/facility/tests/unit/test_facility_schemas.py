import pytest
from datetime import date
from pydantic import ValidationError
from app.schemas import BookingCreate, ApproveRejectPayload

class TestFacilitySchemas:
    def test_booking_create_valid(self):
        booking = BookingCreate(
            facility_id=1,
            booking_date=date(2026, 7, 7),
            start_slot_id=1,
            end_slot_id=2
        )
        assert booking.facility_id == 1

    def test_booking_create_invalid(self):
        with pytest.raises(ValidationError):
            BookingCreate(
                facility_id="not-an-int",
                booking_date="invalid-date",
                start_slot_id=1,
                end_slot_id=2
            )

    def test_approval_request_valid(self):
        approval = ApproveRejectPayload(
            notes="Approved — looks good."
        )
        assert approval.notes == "Approved — looks good."

    def test_approval_request_no_notes(self):
        approval = ApproveRejectPayload()
        assert approval.notes is None

    def test_approval_request_invalid_notes_type(self):
        with pytest.raises(ValidationError):
            ApproveRejectPayload(notes=5)
