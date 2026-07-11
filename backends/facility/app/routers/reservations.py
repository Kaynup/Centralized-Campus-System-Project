from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app import db, schemas, models
from app import services
from app.core.security import get_current_user, require_professor_or_admin
from app.utils.exceptions import (
    NotFoundError,
    SlotUnavailableError,
    InsufficientTokensError,
    UnauthorizedFacilityAccessError,
    QuotaExceededError,
    CancellationNotAllowedError,
    InvalidBookingDurationError,
)
from app.envelope import success_response, error_response

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post(
    "",
    response_model=schemas.BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a reservation"
)
def create_reservation(
    payload: schemas.BookingCreate, # type: ignore
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
    """Create a new booking for a facility."""
    try:
        booking = services.create_booking(
            db_session,
            current_user.id,
            facility_id=payload.facility_id,
            booking_date=payload.booking_date,
            start_slot_id=payload.start_slot_id,
            end_slot_id=payload.end_slot_id,
        )
        return booking
    except (NotFoundError, SlotUnavailableError, InsufficientTokensError,
            UnauthorizedFacilityAccessError, QuotaExceededError, InvalidBookingDurationError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "",
    response_model=List[schemas.BookingListResponse],
    summary="List reservations"
)
def list_reservations(
    facility_id: Optional[int] = None,
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
    """List bookings for the current user (or all if admin)."""
    query = db_session.query(models.Booking)
    if current_user.role != "admin" and current_user.accountType != "admin":
        query = query.filter(models.Booking.user_id == current_user.id)
    if facility_id:
        query = query.filter(models.Booking.facility_id == facility_id)

    bookings = query.all()
    result = []
    for b in bookings:
        facility = b.facility
        # Map RESERVED → ACTIVE for frontend display consistency with standalone
        display_status = "ACTIVE" if b.status == models.BookingStatus.RESERVED else b.status.value

        result.append(schemas.BookingListResponse(
            id=b.id,
            facility_name=facility.name if facility else "Unknown",
            facility_group=facility.facility_group.value if facility else "Unknown",
            date=b.booking_date.strftime("%Y-%m-%d") if b.booking_date else "",
            start_time=b.start_slot.start_time_of_day.strftime("%H:%M") if b.start_slot else "",
            end_time=b.end_slot.end_time_of_day.strftime("%H:%M") if b.end_slot else "",
            status=display_status,
            deposit=b.deposit_paid,
            cancellation_reason=b.cancellation_reason.action_label if b.cancellation_reason else None,
        ))
    return result


@router.get(
    "/preview-cancel/{booking_id}",
    response_model=dict,
    summary="Preview a reservation cancellation"
)
def preview_cancel_reservation(
    booking_id: int,
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
    """Preview a booking cancellation to check refund/penalty before committing."""
    try:
        preview = services.preview_cancellation(
            db_session, booking_id, current_user.id
        )
        return success_response(data=preview, message="Cancellation preview generated")
    except (NotFoundError, UnauthorizedFacilityAccessError, CancellationNotAllowedError) as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/{booking_id}/cancel",
    response_model=dict,
    summary="Cancel a reservation"
)
def cancel_reservation(
    booking_id: int,
    payload: Optional[schemas.CancellationRequest] = Body(default=None), # type: ignore
    db_session: Session = Depends(db.get_db),
    current_user=Depends(get_current_user),
):
    """Cancel a booking with optional reason."""
    try:
        preview = services.execute_cancellation(
            db_session, booking_id, current_user.id,
            reason=None if not payload else payload.reason
        )
        return success_response(data={"refund": preview}, message="Reservation cancelled")
    except (NotFoundError, UnauthorizedFacilityAccessError, CancellationNotAllowedError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{booking_id}/approve",
    response_model=dict,
    summary="Approve a reservation"
)
def approve_reservation(
    booking_id: int,
    payload: schemas.ApproveRejectPayload, # type: ignore
    db_session: Session = Depends(db.get_db),
    current_user=Depends(require_professor_or_admin),
):
    
    try:
        approval = services.action_approval(
            db_session, approval_id=booking_id,
            approver_id=current_user.id,
            approve=True,
            notes=None if not payload.notes else payload.notes
        )
        return success_response(data={"approval_id": approval.id}, message="Reservation approved")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/{booking_id}/reject",
    response_model=dict,
    summary="Reject a reservation"
)
def reject_reservation(
    booking_id: int,
    payload: schemas.ApproveRejectPayload, # type: ignore
    db_session: Session = Depends(db.get_db),
    current_user=Depends(require_professor_or_admin),
):

    try:
        approval = services.action_approval(
            db_session, approval_id=booking_id,
            approver_id=current_user.id,
            approve=False,
            notes=None if not payload.notes else payload.notes
        )
        return success_response(data={"approval_id": approval.id}, message="Reservation rejected")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
