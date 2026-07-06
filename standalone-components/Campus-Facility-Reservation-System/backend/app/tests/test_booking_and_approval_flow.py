from datetime import datetime, timedelta, date

import pytest

from app.db import crud
from app.db.models import (
    ApprovalStatus,
    BookingStatus,
    FacilityGroup,
    TransactionType,
    UserRole,
    ActionReason,
    ActionContext,
)
from app.services.booking_service import create_booking as service_create_booking
from app.services.cancellation_service import preview_cancellation, execute_cancellation, handle_no_show
from app.services.facility_service import get_facility_calendar
from app.services.approval_service import action_approval


@pytest.fixture(autouse=True)
def setup_slots(db_session):
    crud.seed_static_slots(db_session)


def test_student_booking_requires_approval(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Approval Lab",
        "facility_group": FacilityGroup.Labs,
        "capacity": 20,
        "requires_approval": 1,
        "token_cost_per_hour": 12,
        "description": "Lab requiring approval.",
    })
    target_date = date.today() + timedelta(days=2)
    booking = service_create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=target_date, start_slot_id=1, end_slot_id=6)

    assert booking.status == BookingStatus.PENDING
    approval = crud.get_approval_by_booking(db_session, booking.id)
    assert approval is not None
    assert approval.status == ApprovalStatus.PENDING
    expected_balance = 50 - booking.deposit_paid
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == expected_balance


def test_professor_booking_auto_approves(db_session, professor_user):
    facility = crud.create_facility(db_session, {
        "name": "Professor Court",
        "facility_group": FacilityGroup.Courts,
        "capacity": 10,
        "requires_approval": 1, # Student needs approval, professor doesn't
        "token_cost_per_hour": 6,
        "description": "Court for professor auto-approval.",
    })
    target_date = date.today() + timedelta(days=2)
    booking = service_create_booking(db_session, professor_user.id, facility_id=facility.id, booking_date=target_date, start_slot_id=1, end_slot_id=6)

    assert booking.status == BookingStatus.RESERVED
    assert crud.get_approval_by_booking(db_session, booking.id) is None


def test_pending_approval_auto_rejects_when_slot_becomes_taken(db_session, student_user, professor_user, admin_user):
    facility = crud.create_facility(db_session, {
        "name": "Shared Hall",
        "facility_group": FacilityGroup.Halls,
        "capacity": 50,
        "requires_approval": 1,
        "token_cost_per_hour": 6,
        "description": "Hall with approval workflow.",
    })
    target_date = date.today() + timedelta(days=2)

    # Student requests booking
    student_booking = service_create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=target_date, start_slot_id=1, end_slot_id=6)
    assert student_booking.status == BookingStatus.PENDING

    # Admin takes the same block, auto-approving
    admin_booking = service_create_booking(db_session, admin_user.id, facility_id=facility.id, booking_date=target_date, start_slot_id=1, end_slot_id=6)
    assert admin_booking.status == BookingStatus.RESERVED

    # Professor approves the pending student booking, should auto-reject
    approval = crud.get_approval_by_booking(db_session, student_booking.id)
    import uuid
    action_reason = ActionReason(action_label=f"APP_NOTE_{uuid.uuid4().hex[:8]}", reason_statement="Slot already taken")
    db_session.add(action_reason)
    db_session.commit()
    
    result = action_approval(db_session, approval.id, professor_user.id, approve=True, notes_id=action_reason.id)

    refreshed_booking = crud.get_booking_by_id(db_session, student_booking.id)
    assert result.status == ApprovalStatus.REJECTED
    assert refreshed_booking.status == BookingStatus.REJECTED
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 56.0


def test_full_cancellation_flow(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Cancel Flow Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 20,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    target_date = date.today() + timedelta(days=2)
    booking = service_create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=target_date, start_slot_id=1, end_slot_id=6)
    
    assert booking.status == BookingStatus.RESERVED
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 50 - booking.deposit_paid

    result = execute_cancellation(db_session, booking.id, student_user.id)
    assert result["refund_amount"] == booking.deposit_paid
    assert crud.get_booking_by_id(db_session, booking.id).status == BookingStatus.CANCELLED
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 50


def test_get_facility_calendar_includes_my_bookings(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Calendar Check Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 20,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    target_date = date.today() + timedelta(days=2)
    
    booking = service_create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=target_date, start_slot_id=10, end_slot_id=15)
    calendar = get_facility_calendar(db_session, facility.id, target_date, current_user=student_user)

    my_booking_slots = [slot for slot in calendar if slot["status"] == "MY_BOOKING"]
    assert len(my_booking_slots) == 6
    assert my_booking_slots[0]["booking_id"] == booking.id
