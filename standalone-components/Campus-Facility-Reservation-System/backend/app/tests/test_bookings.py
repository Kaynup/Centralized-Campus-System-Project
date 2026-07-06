from datetime import datetime, timedelta, date

import pytest

from app.db import crud
from app.db.models import (
    ApprovalStatus,
    BookingStatus,
    FacilityGroup,
    SystemLog,
    TransactionType,
)
from app.services.booking_service import create_booking
from app.utils.exceptions import (
    SlotUnavailableError,
    InsufficientTokensError,
    UnauthorizedFacilityAccessError,
    QuotaExceededError,
    InvalidBookingDurationError,
)

@pytest.fixture(autouse=True)
def setup_slots(db_session):
    crud.seed_static_slots(db_session)

def test_create_booking_auto_approved(db_session, professor_user):
    facility = crud.create_facility(db_session, {
        "name": "Professor Court",
        "facility_group": FacilityGroup.Courts,
        "capacity": 10,
        "requires_approval": 0, # Auto-approved
        "token_cost_per_hour": 5,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15

    booking = create_booking(db_session, professor_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)

    assert booking.status == BookingStatus.RESERVED
    assert crud.get_approval_by_booking(db_session, booking.id) is None


def test_create_booking_pending(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Approval Lab",
        "facility_group": FacilityGroup.Labs,
        "capacity": 20,
        "requires_approval": 1, # Needs approval for students
        "token_cost_per_hour": 8,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15

    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)

    assert booking.status == BookingStatus.PENDING
    approval = crud.get_approval_by_booking(db_session, booking.id)
    assert approval is not None
    assert approval.status == ApprovalStatus.PENDING


def test_create_booking_deducts_tokens_correctly(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Costly Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 6, # 1 token per 10 mins
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15 # 6 slots = 1 hour

    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)
    expected_balance = 50 - booking.deposit_paid

    assert crud.get_user_by_id(db_session, student_user.id).token_balance == expected_balance


def test_create_booking_creates_deposit_transaction(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Deposit Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15

    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)
    transactions = crud.get_transactions_by_user(db_session, student_user.id)
    
    assert len(transactions) == 1
    assert transactions[0].type == TransactionType.DEPOSIT
    assert transactions[0].amount == -booking.deposit_paid
    assert transactions[0].booking_id == booking.id


def test_create_booking_creates_system_log(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Log Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 5,
    })
    booking_date = date.today() + timedelta(days=2)
    start_slot_id = 10
    end_slot_id = 15

    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=start_slot_id, end_slot_id=end_slot_id)
    logs = crud.get_logs(db_session)
    
    booking_logs = [log for log in logs if log.booking_id == booking.id]
    assert len(booking_logs) > 0
    assert any(log.action == "BOOKING_CREATED" for log in booking_logs)


def test_create_booking_fails_on_overlap(db_session, student_user, professor_user):
    facility = crud.create_facility(db_session, {
        "name": "Overlap Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 5,
    })
    booking_date = date.today() + timedelta(days=2)
    
    # Professor books 10 to 15
    create_booking(db_session, professor_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=10, end_slot_id=15)

    # Student tries to book 12 to 14
    with pytest.raises(SlotUnavailableError):
        create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=12, end_slot_id=14)

    # Student tries to book 8 to 11
    with pytest.raises(SlotUnavailableError):
        create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=8, end_slot_id=11)


def test_create_booking_fails_insufficient_tokens(db_session, student_user):
    # Set tokens to 0
    student_user.token_balance = 0
    db_session.commit()

    facility = crud.create_facility(db_session, {
        "name": "Expensive Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 100,
    })
    booking_date = date.today() + timedelta(days=2)

    with pytest.raises(InsufficientTokensError):
        create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=10, end_slot_id=15)


def test_create_booking_fails_quota_exceeded(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Quota Room",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
    })
    booking_date = date.today() + timedelta(days=2)
    
    # Student has limit of 1 active reservation.
    create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=10, end_slot_id=15)
    
    # Try to create a second active reservation
    with pytest.raises(QuotaExceededError):
        create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=20, end_slot_id=25)


def test_create_booking_fails_invalid_duration(db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Quick Court",
        "facility_group": FacilityGroup.Courts,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
    })
    booking_date = date.today() + timedelta(days=2)
    
    # Courts require min 6 slots (60 mins), trying to book 3 slots should fail
    with pytest.raises(InvalidBookingDurationError) as exc:
        create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=10, end_slot_id=12)
    
    assert exc.value.min_slots == 6
