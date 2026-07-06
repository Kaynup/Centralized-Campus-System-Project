from datetime import date, timedelta

import pytest

from app.db import crud
from app.services import booking_service


def test_booking_rolls_back_on_transaction_failure(db_session, student_user):
    # create facility and future slot
    facility = crud.create_facility(db_session, {
        "name": "Rollback Hall",
        "facility_group": "Halls",
        "capacity": 30,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
    })

    crud.seed_static_slots(db_session)
    booking_date = date.today() + timedelta(days=1)
    start_slot_id = 1
    end_slot_id = 6

    user_before = crud.get_user_by_id(db_session, student_user.id)
    balance_before = user_before.token_balance

    # monkeypatch create_transaction to raise during booking deposit creation
    original_create_transaction = crud.create_transaction

    def raising_create_transaction(*args, **kwargs):
        raise RuntimeError("simulated DB failure")

    crud.create_transaction = raising_create_transaction

    with pytest.raises(RuntimeError):
        booking_service.create_booking(
            db_session, 
            student_user.id, 
            facility_id=facility.id, 
            booking_date=booking_date,
            start_slot_id=start_slot_id, 
            end_slot_id=end_slot_id
        )

    # restore
    crud.create_transaction = original_create_transaction

    user_after = crud.get_user_by_id(db_session, student_user.id)
    assert user_after.token_balance == balance_before, "User balance should be unchanged after rollback"
