from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Facility, FacilityGroup

def get_facility_by_id(db: Session, facility_id: int) -> Optional[Facility]:
    return db.get(Facility , facility_id)


def get_all_facilities(db: Session, active_only: bool = True) -> List[Facility]:
    query = db.query(Facility)

    if active_only:
        query = query.filter(Facility.is_active == True)

    return query.all()

def get_facilities_by_group(db: Session, group: str) -> List[Facility]:
    if isinstance(group, str):
        normalized = group.strip()
        try:
            group = FacilityGroup(normalized)
        except ValueError:
            for member in FacilityGroup:
                if member.value.lower() == normalized.lower():
                    group = member
                    break
            else:
                return []

    return (
            db.query(Facility)
            .filter(Facility.facility_group == group)
            .all()
            )


def create_facility(db: Session, data: dict) -> Facility:
    facility = Facility(**data)

    db.add(facility)
    db.commit()
    db.refresh(facility)

    return facility


def update_facility(db: Session, facility_id: int, updates: dict) -> Facility:
    facility = get_facility_by_id(db, facility_id)

    if facility is None:
        raise ValueError("Facility not found")

    for key, value in updates.items():
        setattr(facility, key, value)

    db.commit()
    db.refresh(facility)

    return facility
