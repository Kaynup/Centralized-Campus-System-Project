"""
app/api/v1/facilities.py
────────────────────────
Facility and slot browsing endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date as _date

from app.db.session import get_db
from app.db.schemas import FacilityOut, SlotOut, FacilityCalendarSlotOut
from app.services import facility_service
from app.core.security import require_admin
from app.db import crud
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/facilities", tags=["Facilities"])


@router.get("", response_model=List[FacilityOut], response_model_by_alias=True, summary="List facilities", responses={400: {"description": "Bad request"}})
def list_facilities(group: Optional[str] = Query(None), active_only: bool = Query(True), db: Session = Depends(get_db)):
    facilities = facility_service.get_facilities(db, group=group, active_only=active_only)
    return facilities


@router.get("/{facility_id}", response_model=FacilityOut, response_model_by_alias=True, summary="Get facility by id", responses={404: {"description": "Facility not found"}})
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    facility = crud.get_facility_by_id(db, facility_id)
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.get("/{facility_id}/slots", response_model=List[FacilityCalendarSlotOut], response_model_by_alias=True, summary="Get slots for facility on a date", responses={400: {"description": "Invalid date format"}})
def get_facility_slots(facility_id: int, date: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    try:
        target_date = _date.fromisoformat(date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format; use YYYY-MM-DD")
    slots = facility_service.get_slots_for_date(db, facility_id, target_date, current_user=current_user)
    return slots


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FacilityOut, response_model_by_alias=True, summary="Create a facility (admin)", responses={403: {"description": "Admin access required"}})
def create_facility(payload: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    facility = crud.create_facility(db, payload)
    return facility


@router.patch("/{facility_id}", response_model=FacilityOut, response_model_by_alias=True, summary="Update facility (admin)", responses={403: {"description": "Admin access required"}, 404: {"description": "Facility not found"}})
def update_facility(facility_id: int, updates: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    facility = crud.update_facility(db, facility_id, updates)
    return facility
