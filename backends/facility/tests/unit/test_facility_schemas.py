import pytest
from decimal import Decimal
from pydantic import ValidationError
from schemas import BookingCreate, ApprovalRequest

class TestFacilitySchemas:
    def test_booking_create_valid(self):
        booking = BookingCreate(
            user_id="user123",
            facility_id=1,
            booking_date="2026-07-07",
            start_slot_id=1,
            end_slot_id=2,
            status="PENDING"
        )
        assert booking.user_id == "user123"
        assert booking.status == "PENDING"

    def test_booking_create_invalid(self):
        with pytest.raises(ValidationError):
            BookingCreate(
                user_id="user123",
                facility_id=1,
                booking_date="invalid-date",
                start_slot_id=1,
                end_slot_id=2,
                status="PENDING"
            )

    def test_approval_request_valid(self):
        approval = ApprovalRequest(
            booking_id=1,
            approver_id="approver123",
            status="APPROVED"
        )
        assert approval.status == "APPROVED"
