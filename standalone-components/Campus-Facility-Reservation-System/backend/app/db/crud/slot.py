from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import time, timedelta
from app.db.models import Slot

def get_slot_by_id(db: Session, slot_id: int) -> Optional[Slot]:
    return db.get(Slot, slot_id)

def get_all_slots(db: Session) -> List[Slot]:
    """Return the static 60-slot daily template."""
    return db.query(Slot).order_by(Slot.id).all()

def seed_static_slots(db: Session) -> List[Slot]:
    """
    Idempotent function to seed the 60 static 10-minute slots (07:00 to 17:00).
    Called on app startup or via admin endpoint.
    """
    existing_count = db.query(Slot).count()
    if existing_count >= 60:
        return get_all_slots(db)

    # We need 60 slots from 07:00 to 17:00
    import datetime
    
    start_time = datetime.datetime.strptime("07:00", "%H:%M")
    
    created_slots = []
    for _ in range(60):
        end_time = start_time + datetime.timedelta(minutes=10)
        
        slot = Slot(
            start_time_of_day=start_time.time(),
            end_time_of_day=end_time.time(),
            is_peak_hour=False # Default
        )
        db.add(slot)
        created_slots.append(slot)
        
        start_time = end_time

    db.commit()
    for s in created_slots:
        db.refresh(s)
        
    return created_slots
