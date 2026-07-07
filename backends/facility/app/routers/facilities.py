from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date as _date

from app.db import db
from app.db import models, schemas
from app import services
from app.core.security import require_admin, get_current_user_optional

router = APIRouter(prefix="/facilities", tags=["Facilities"])


@router.get(
    "",
    response_model=List[schemas.FacilityResponse],
    response_model_by_alias=True,
    summary="List facilities",
    responses={400: {"description": "Bad request"}}
)
def list_facilities(
    group: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db_session: Session = Depends(db.get_db),
):
   
    facilities = services.get_facilities(db_session, group=group, active_only=active_only)
    return facilities


@router.get(
    "/{facility_id}",
    response_model=schemas.FacilityResponse,
    response_model_by_alias=True,
    summary="Get facility by id",
    responses={404: {"description": "Facility not found"}}
)
def get_facility(
    facility_id: int,
    db_session: Session = Depends(db.get_db),
):
    
    facility = db_session.query(models.Facility).filter(models.Facility.id == facility_id).first()
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.get(
    "/{facility_id}/slots",
    response_model=List[schemas.FacilityCalendarSlotResponse],
    response_model_by_alias=True,
    summary="Get slots for facility on a date",
    responses={400: {"description": "Invalid date format"}}
)
def get_facility_slots(
    facility_id: int,
    date: str,
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user_optional),
):
    
    try:
        target_date = _date.fromisoformat(date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format; use YYYY-MM-DD")

    slots = services.get_slots_for_date(db_session, facility_id, target_date, current_user=current_user)
    return slots


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.FacilityResponse,
    response_model_by_alias=True,
    summary="Create a facility (admin)",
    responses={403: {"description": "Admin access required"}}
)
def create_facility(
    payload: dict,
    db_session: Session = Depends(db.get_db),
    _: str = Depends(require_admin),
):
   
    facility = models.Facility(**payload)
    db_session.add(facility)
    db_session.commit()
    db_session.refresh(facility)
    return facility


@router.patch(
    "/{facility_id}",
    response_model=schemas.FacilityResponse,
    response_model_by_alias=True,
    summary="Update facility (admin)",
    responses={403: {"description": "Admin access required"}, 404: {"description": "Facility not found"}}
)
def update_facility(
    facility_id: int,
    updates: dict,
    db_session: Session = Depends(db.get_db),
    _: str = Depends(require_admin),
):
   
    facility = db_session.query(models.Facility).filter(models.Facility.id == facility_id).first()
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")

    for key, value in updates.items():
        setattr(facility, key, value)

    db_session.commit()
    db_session.refresh(facility)
    return facility
