# facility/app/init_db.py
from app.db import Base, engine
from app.models import Facility, Slot, Booking, Unavailability, Approval, SystemLog, ActionReason

def init_db():
    print("Creating facility tables...")
    Base.metadata.create_all(bind=engine, tables=[
        Facility.__table__,
        Slot.__table__,
        Booking.__table__,
        Unavailability.__table__,
        Approval.__table__,
        SystemLog.__table__,
        ActionReason.__table__,
    ])
    print("Done.")

if __name__ == "__main__":
    init_db()
