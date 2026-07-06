from datetime import datetime, timedelta, date, timezone
from unittest.mock import patch

import pytest

from app.db import crud
from app.db.models import (
    BookingStatus,
    FacilityGroup,
    TransactionType,
)
from app.services.cancellation_service import preview_cancellation, execute_cancellation
from app.services.booking_service import create_booking


@pytest.fixture(autouse=True)
def setup_slots(db_session):
    crud.seed_static_slots(db_session)


@patch("app.utils.time_utils.datetime")
@patch("app.services.cancellation_service.datetime")
def test_cancel_24h_ahead_full_refund(mock_datetime_service, mock_datetime_utils, db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Full Refund Lab",
        "facility_group": FacilityGroup.Labs,
        "capacity": 20,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    booking_date = date.today() + timedelta(days=2)
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=1, end_slot_id=6)
    
    # Mock now to be exactly 25 hours before the booking
    start_dt = datetime.combine(booking.booking_date, booking.start_slot.start_time_of_day)
    start_dt = start_dt.replace(tzinfo=timezone.utc)
    mock_now = start_dt - timedelta(hours=25)
    mock_datetime_service.now.return_value = mock_now
    mock_datetime_service.combine.side_effect = datetime.combine # passthrough
    mock_datetime_utils.now.return_value = mock_now
    mock_datetime_utils.utcnow.return_value = mock_now.replace(tzinfo=None)

    preview = preview_cancellation(db_session, booking.id, student_user.id)
    assert preview["refund_pct"] == 100
    assert preview["penalty_pct"] == 0
    assert preview["refund_amount"] == booking.deposit_paid

    result = execute_cancellation(db_session, booking.id, student_user.id)
    assert result["refund_amount"] == booking.deposit_paid
    assert crud.get_booking_by_id(db_session, booking.id).status == BookingStatus.CANCELLED
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 50


@patch("app.utils.time_utils.datetime")
@patch("app.services.cancellation_service.datetime")
def test_cancel_18h_ahead_half_refund(mock_datetime_service, mock_datetime_utils, db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Half Refund Hall",
        "facility_group": FacilityGroup.Halls,
        "capacity": 20,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    booking_date = date.today() + timedelta(days=2)
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=1, end_slot_id=6)

    # Mock now to be exactly 18 hours before the booking
    start_dt = datetime.combine(booking.booking_date, booking.start_slot.start_time_of_day)
    start_dt = start_dt.replace(tzinfo=timezone.utc)
    mock_now = start_dt - timedelta(hours=18)
    mock_datetime_service.now.return_value = mock_now
    mock_datetime_service.combine.side_effect = datetime.combine # passthrough
    mock_datetime_utils.now.return_value = mock_now
    mock_datetime_utils.utcnow.return_value = mock_now.replace(tzinfo=None)

    preview = preview_cancellation(db_session, booking.id, student_user.id)
    assert preview["refund_pct"] == 50
    assert preview["penalty_pct"] == 50

    result = execute_cancellation(db_session, booking.id, student_user.id)
    # the deposit is 1.0 token, half refund is 0.5 rounded to 0.50
    assert result["refund_amount"] == booking.deposit_paid / 2
    assert result["penalty_amount"] == booking.deposit_paid - result["refund_amount"]
    expected_balance = 50 - booking.deposit_paid + result["refund_amount"]
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == expected_balance


@patch("app.utils.time_utils.datetime")
@patch("app.services.cancellation_service.datetime")
def test_cancel_6h_ahead_no_refund(mock_datetime_service, mock_datetime_utils, db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "No Refund Classroom",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 10,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    booking_date = date.today() + timedelta(days=2)
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=1, end_slot_id=6)

    # Mock now to be exactly 6 hours before the booking
    start_dt = datetime.combine(booking.booking_date, booking.start_slot.start_time_of_day)
    start_dt = start_dt.replace(tzinfo=timezone.utc)
    mock_now = start_dt - timedelta(hours=6)
    mock_datetime_service.now.return_value = mock_now
    mock_datetime_service.combine.side_effect = datetime.combine # passthrough
    mock_datetime_utils.now.return_value = mock_now
    mock_datetime_utils.utcnow.return_value = mock_now.replace(tzinfo=None)

    preview = preview_cancellation(db_session, booking.id, student_user.id)
    assert preview["refund_pct"] == 0
    assert preview["penalty_pct"] == 100

    result = execute_cancellation(db_session, booking.id, student_user.id)
    assert result["refund_amount"] == 0
    assert result["penalty_amount"] == booking.deposit_paid
    assert crud.get_user_by_id(db_session, student_user.id).token_balance == 50 - booking.deposit_paid


@patch("app.utils.time_utils.datetime")
@patch("app.services.cancellation_service.datetime")
def test_cancellation_penalty_creates_transaction(mock_datetime_service, mock_datetime_utils, db_session, student_user):
    facility = crud.create_facility(db_session, {
        "name": "Penalty Hall",
        "facility_group": FacilityGroup.Halls,
        "capacity": 20,
        "requires_approval": 0,
        "token_cost_per_hour": 6,
    })
    booking_date = date.today() + timedelta(days=2)
    booking = create_booking(db_session, student_user.id, facility_id=facility.id, booking_date=booking_date, start_slot_id=1, end_slot_id=6)

    # Mock now to be exactly 6 hours before the booking (100% penalty)
    start_dt = datetime.combine(booking.booking_date, booking.start_slot.start_time_of_day)
    start_dt = start_dt.replace(tzinfo=timezone.utc)
    mock_now = start_dt - timedelta(hours=6)
    mock_datetime_service.now.return_value = mock_now
    mock_datetime_service.combine.side_effect = datetime.combine
    mock_datetime_utils.now.return_value = mock_now
    mock_datetime_utils.utcnow.return_value = mock_now.replace(tzinfo=None)

    execute_cancellation(db_session, booking.id, student_user.id)
    transactions = crud.get_transactions_by_user(db_session, student_user.id)
    
    # [Deposit, Penalty]
    penalty_txn = next(t for t in transactions if t.type == TransactionType.PENALTY)
    assert penalty_txn is not None
    assert penalty_txn.amount == -booking.deposit_paid
    assert penalty_txn.booking_id == booking.id
