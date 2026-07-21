import os
import sys
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Facility, FacilityGroup, Slot, ActionReason, ActionContext

FACILITIES = [
    {
        "name": "Basketball Court A",
        "facility_group": FacilityGroup.Courts,
        "capacity": 12,
        "requires_approval": 0,
        "token_cost_per_hour": 2,
        "description": "Indoor basketball court with seating for spectators.",
    },
    {
        "name": "Tennis Court B",
        "facility_group": FacilityGroup.Courts,
        "capacity": 4,
        "requires_approval": 0,
        "token_cost_per_hour": 3,
        "description": "Outdoor tennis court with new seating and lighting.",
    },
    {
        "name": "Sports Court C",
        "facility_group": FacilityGroup.Courts,
        "capacity": 8,
        "requires_approval": 0,
        "token_cost_per_hour": 4,
        "description": "Multi-sport court for basketball, volleyball, and futsal.",
    },
    {
        "name": "Lecture Room 101",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 60,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
        "description": "Standard lecture hall with projector and whiteboard.",
    },
    {
        "name": "Seminar Auditorium 303",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 120,
        "requires_approval": 1,
        "token_cost_per_hour": 5,
        "description": "Large classroom auditorium for seminars and guest lectures.",
    },
    {
        "name": "Study Room 201",
        "facility_group": FacilityGroup.Classrooms,
        "capacity": 8,
        "requires_approval": 0,
        "token_cost_per_hour": 1,
        "description": "Small group study room with whiteboard and comfortable seating.",
    },
    {
        "name": "CS Research Lab",
        "facility_group": FacilityGroup.Labs,
        "capacity": 24,
        "requires_approval": 2,
        "token_cost_per_hour": 5,
        "description": "Computer science lab for research and prototyping.",
    },
    {
        "name": "Physics Laboratory B",
        "facility_group": FacilityGroup.Labs,
        "capacity": 18,
        "requires_approval": 2,
        "token_cost_per_hour": 6,
        "description": "Physics lab with specialized equipment and safety systems.",
    },
    {
        "name": "Engineering Lab A",
        "facility_group": FacilityGroup.Labs,
        "capacity": 16,
        "requires_approval": 2,
        "token_cost_per_hour": 6,
        "description": "Hands-on engineering lab for prototypes and student projects.",
    },
    {
        "name": "Main Conference Hall",
        "facility_group": FacilityGroup.Halls,
        "capacity": 150,
        "requires_approval": 1,
        "token_cost_per_hour": 8,
        "description": "Large hall for events, seminars, and guest lectures.",
    },
    {
        "name": "Executive Meeting Hall",
        "facility_group": FacilityGroup.Halls,
        "capacity": 40,
        "requires_approval": 1,
        "token_cost_per_hour": 7,
        "description": "Premium meeting hall for executive sessions and presentations.",
    },
]

def seed_facilities(db: Session):
    for attrs in FACILITIES:
        facility = db.scalar(select(Facility).where(Facility.name == attrs["name"]))
        if facility:
            for key, value in attrs.items():
                setattr(facility, key, value)
        else:
            facility = Facility(**attrs)
            db.add(facility)
    db.commit()

def seed_slots(db: Session):
    existing_count = db.query(Slot).count()
    if existing_count >= 60:
        return

    start_time = datetime.datetime.strptime("07:00", "%H:%M")
    
    for _ in range(60):
        end_time = start_time + datetime.timedelta(minutes=10)
        slot = Slot(
            start_time_of_day=start_time.time(),
            end_time_of_day=end_time.time(),
            is_peak_hour=False
        )
        db.add(slot)
        start_time = end_time

    db.commit()

def seed_action_reasons(db: Session):
    reasons = [
        (ActionContext.ADMIN_MAINTENANCE, "Maintenance and cleaning schedule."),
        (ActionContext.USER_CANCELLATION, "User cancelled the booking."),
        (ActionContext.ADMIN_CANCELLATION, "Admin cancelled the booking."),
        (ActionContext.APPROVAL_NOTES, "Approval notes provided."),
        (ActionContext.REJECTION_NOTES, "Rejection notes provided.")
    ]
    
    for context, statement in reasons:
        reason = db.scalar(select(ActionReason).where(ActionReason.action_label == context.value))
        if not reason:
            reason = ActionReason(
                action_label=context.value,
                reason_statement=statement
            )
            db.add(reason)
    db.commit()

def main():
    db = SessionLocal()
    try:
        print("Seeding facilities...")
        seed_facilities(db)
        print("Seeding slots...")
        seed_slots(db)
        print("Seeding action reasons...")
        seed_action_reasons(db)
        print("Facility service seeded successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
