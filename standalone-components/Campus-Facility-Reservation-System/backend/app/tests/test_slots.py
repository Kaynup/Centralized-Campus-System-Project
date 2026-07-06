from datetime import time

from app.db.crud import seed_static_slots
from app.db.models import Slot

def test_seed_static_slots_creates_exactly_60_slots(db_session):
    seed_static_slots(db_session)
    
    slots = db_session.query(Slot).order_by(Slot.id).all()
    
    assert len(slots) == 60
    assert slots[0].id == 1
    assert slots[0].start_time_of_day == time(7, 0)
    assert slots[0].end_time_of_day == time(7, 10)
    
    assert slots[-1].id == 60
    assert slots[-1].start_time_of_day == time(16, 50)
    assert slots[-1].end_time_of_day == time(17, 0)


def test_seed_static_slots_is_idempotent(db_session):
    seed_static_slots(db_session)
    count_first = db_session.query(Slot).count()
    
    # Run it again, should not create duplicates
    seed_static_slots(db_session)
    count_second = db_session.query(Slot).count()
    
    assert count_first == 60
    assert count_second == 60
