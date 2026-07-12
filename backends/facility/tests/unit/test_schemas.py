import pytest
import sys
import os
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.schemas import FacilityBase, BookingBase
from app.models import FacilityGroup, BookingStatus

class TestFacilitySchemas:
    def test_facility_base_valid(self):
        facility = FacilityBase(
            name="Tennis Court 1",
            facility_group=FacilityGroup.Courts,
            capacity=4,
            requires_approval=0,
            token_cost_per_hour=5.0
        )
        assert facility.name == "Tennis Court 1"
        assert facility.capacity == 4
        assert facility.token_cost_per_hour == 5.0

    def test_facility_base_invalid_capacity(self):
        with pytest.raises(ValidationError):
            FacilityBase(
                name="Tennis Court 2",
                facility_group=FacilityGroup.Courts,
                capacity=0, # capacity must be > 0
                requires_approval=0
            )

    def test_booking_base_valid(self):
        from datetime import date
        booking = BookingBase(
            facility_id=1,
            booking_date=date(2026, 8, 1),
            start_slot_id=1,
            end_slot_id=2,
            status=BookingStatus.PENDING
        )
        assert booking.facility_id == 1
        assert booking.start_slot_id == 1
