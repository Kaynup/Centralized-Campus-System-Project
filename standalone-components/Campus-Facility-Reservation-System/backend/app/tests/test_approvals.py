from datetime import datetime, timedelta, date

import pytest

from app.db import crud
from app.db.models import (
    ApprovalStatus,
    BookingStatus,
    FacilityGroup,
    ActionReason,
    ActionContext
)
from app.services.booking_service import create_booking
from app.services.approval_service import action_approval


@pytest.fixture(autouse=True)
def setup_slots(db_session):
    crud.seed_static_slots(db_session)


def test_approve_pending_booking_marks_reserved(db_session, student_user, professor_user):
    facility = crud.create_facility(db_session, {
        "name": "Approval Lab",
        "facility_group": FacilityGroup.Labs,
        "capacity": 20,
        "requires_approval": 1,
        "token_cost_per_hour": 5,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)
    approval = crud.get_approval_by_booking(db_session, booking.id)

    import uuid
    action_reason = ActionReason(action_label=f"APP_NOTE_{uuid.uuid4().hex[:8]}", reason_statement="Looks good")
    db_session.add(action_reason)
    db_session.commit()

    result = action_approval(db_session, approval.id, professor_user.id, approve=True, notes_id=action_reason.id)
    refreshed_booking = crud.get_booking_by_id(db_session, booking.id)

    assert result.status == ApprovalStatus.APPROVED
    assert refreshed_booking.status == BookingStatus.RESERVED


def test_approve_when_slot_taken_auto_rejects(db_session, student_user, professor_user, admin_user):
    facility = crud.create_facility(db_session, {
        "name": "Conflict Classroom",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 20,
        "requires_approval": 1,
        "token_cost_per_hour": 5,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15
    
    # Student makes request (pending)
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)
    approval = crud.get_approval_by_booking(db_session, booking.id)

    # Admin comes in and snipes the slot (auto-reserved)
    create_booking(db_session, admin_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=12, end_slot_id=14)

    # Professor tries to approve the student's request, but it overlaps with admin's booking
    result = action_approval(db_session, approval.id, professor_user.id, approve=True)
        
    refreshed_booking = crud.get_booking_by_id(db_session, booking.id)

    assert result.status == ApprovalStatus.REJECTED
    assert refreshed_booking.status == BookingStatus.REJECTED
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 55.0 # Double refund bug


def test_reject_refunds_full_deposit(db_session, student_user, professor_user):
    facility = crud.create_facility(db_session, {
        "name": "Rejection Hall",
        "facility_group": FacilityGroup.Halls,
        "capacity": 50,
        "requires_approval": 1,
        "token_cost_per_hour": 10,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)
    approval = crud.get_approval_by_booking(db_session, booking.id)

    import uuid
    action_reason = ActionReason(action_label=f"REJ_NOTE_{uuid.uuid4().hex[:8]}", reason_statement="Not allowed")
    db_session.add(action_reason)
    db_session.commit()

    result = action_approval(db_session, approval.id, professor_user.id, approve=False, notes_id=action_reason.id)
    refreshed_booking = crud.get_booking_by_id(db_session, booking.id)

    assert result.status == ApprovalStatus.REJECTED
    assert refreshed_booking.status == BookingStatus.REJECTED
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 50 # Refunded
