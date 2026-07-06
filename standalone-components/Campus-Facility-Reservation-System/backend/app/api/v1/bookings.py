"""
app/api/v1/bookings.py
───────────────────────
Booking creation, cancellation, and listing.
Implemented to call service layer functions and return Pydantic responses.
"""

from typing import List, Optional
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import (
    BookingCreate,
    BookingOut,
    BookingDetailOut,
    BookingListOut,
    CancellationRequest,
    CancellationPreviewOut,
    ApproveRejectPayload,
)
from app.db.models import UserRole, BookingStatus, Booking, ActionReason, ActionContext
from app.core.security import get_current_user
from app.services import booking_service, cancellation_service, approval_service
from app.utils.exceptions import (
    SlotUnavailableError,
    InsufficientTokensError,
    UnauthorizedFacilityAccessError,
    QuotaExceededError,
    CancellationNotAllowedError,
    NotFoundError,
    SlotInPastError,
    InvalidBookingDurationError,
)
from app.utils.response_helpers import success_response
from app.db.crud import get_booking_by_id, get_approval_by_booking
from app.core.security import require_professor_or_admin

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED, response_model_by_alias=True, summary="Create a booking")
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        booking = booking_service.create_booking(
            db,
            current_user.id,
            facility_id=payload.facility_id,
            booking_date=payload.booking_date,
            start_slot_id=payload.start_slot_id,
            end_slot_id=payload.end_slot_id,
        )
        return booking
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SlotUnavailableError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except InsufficientTokensError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except UnauthorizedFacilityAccessError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except QuotaExceededError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidBookingDurationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[BookingListOut], response_model_by_alias=True, summary="List bookings")
def list_bookings(
    status: Optional[str] = None,
    facility_id: Optional[int] = None,
    date: Optional[str] = None,
    all_users: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    target_date = None
    if date:
        try:
            target_date = datetime.fromisoformat(date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format; use YYYY-MM-DD")

    # TODO: Implement get_all_bookings / get_bookings_for_user in booking_service or crud
    # For now, we will just fetch from crud
    query = db.query(Booking)
    if not (current_user.role == UserRole.admin and all_users):
        query = query.filter(Booking.user_id == current_user.id)
    if status:
        query = query.filter(Booking.status == BookingStatus(status))
    if facility_id:
        query = query.filter(Booking.facility_id == facility_id)
    if target_date:
        query = query.filter(Booking.booking_date == target_date)
        
    bookings = query.all()

    result = []
    for b in bookings:
        facility = b.facility
        # Map RESERVED → ACTIVE for frontend
        display_status = 'ACTIVE' if b.status == BookingStatus.RESERVED else b.status.value
        
        result.append(BookingListOut(
            id=b.id,
            facility_name=facility.name if facility else "Unknown",
            facility_group=facility.facility_group.value if facility else "Unknown",
            date=b.booking_date.strftime('%Y-%m-%d') if b.booking_date else "",
            start_time=b.start_slot.start_time_of_day.strftime('%H:%M') if b.start_slot else "",
            end_time=b.end_slot.end_time_of_day.strftime('%H:%M') if b.end_slot else "",
            status=display_status,
            deposit=b.deposit_paid,
            cancellation_reason=b.cancellation_reason.action_label if b.cancellation_reason else None,
        ))
    
    return result


@router.get("/preview-cancel/{booking_id}", response_model=CancellationPreviewOut, response_model_by_alias=True, summary="Preview cancellation refund/penalty")
def preview_cancellation(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        preview = cancellation_service.preview_cancellation(db, booking_id, current_user.id)
        return CancellationPreviewOut(
            refund_amount=preview["refund_amount"],
            penalty_amount=preview["penalty_amount"],
            refund_pct=preview["refund_pct"],
            penalty_pct=preview["penalty_pct"],
            hours_until_start=preview["hours_until_start"],
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except CancellationNotAllowedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{booking_id}", response_model=BookingDetailOut, response_model_by_alias=True, summary="Get a booking by id")
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = get_booking_by_id(db, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    return booking


@router.post("/{booking_id}/cancel", response_model=dict, response_model_by_alias=True, summary="Cancel a booking")
def cancel_booking(
    booking_id: int,
    payload: Optional[CancellationRequest] = Body(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        reason_id = None
        if payload and payload.reason:
            action_reason = ActionReason(
                context=ActionContext.USER_CANCELLATION,
                message=payload.reason[:150],
                author_id=current_user.id
            )
            db.add(action_reason)
            db.flush()
            reason_id = action_reason.id

        preview = cancellation_service.execute_cancellation(db, booking_id, current_user.id, reason_id=reason_id)
        return success_response(data={"refund": preview}, message="Booking cancelled")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except CancellationNotAllowedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{booking_id}", response_model=dict, response_model_by_alias=True, summary="Cancel a booking (DELETE)")
def cancel_booking_delete(
    booking_id: int,
    payload: Optional[CancellationRequest] = Body(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        reason_id = None
        if payload and payload.reason:
            action_reason = ActionReason(
                action_label=f"CUSTOM_CXL_{uuid.uuid4().hex[:8]}",
                reason_statement=payload.reason[:255]
            )
            db.add(action_reason)
            db.flush()
            reason_id = action_reason.id

        preview = cancellation_service.execute_cancellation(db, booking_id, current_user.id, reason_id=reason_id)
        return success_response(data={"refund": preview}, message="Booking cancelled")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except CancellationNotAllowedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{booking_id}/approve", response_model=dict, response_model_by_alias=True, summary="Approve a pending booking")
def approve_booking(
    booking_id: int,
    payload: ApproveRejectPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_professor_or_admin),
):
    approval = get_approval_by_booking(db, booking_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval record not found")
    try:
        notes_id = None
        if payload and payload.notes:
            action_reason = ActionReason(
                action_label=f"CUSTOM_APP_{uuid.uuid4().hex[:8]}",
                reason_statement=payload.notes[:255]
            )
            db.add(action_reason)
            db.flush()
            notes_id = action_reason.id

        result = approval_service.action_approval(
            db, approval.id, current_user.id, approve=True, notes_id=notes_id
        )
        return success_response(data={"approval_id": result.id}, message="Booking approved")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{booking_id}/reject", response_model=dict, response_model_by_alias=True, summary="Reject a pending booking")
def reject_booking(
    booking_id: int,
    payload: ApproveRejectPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_professor_or_admin),
):
    approval = get_approval_by_booking(db, booking_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval record not found")
    try:
        notes_id = None
        if payload and payload.notes:
            action_reason = ActionReason(
                action_label=f"CUSTOM_REJ_{uuid.uuid4().hex[:8]}",
                reason_statement=payload.notes[:255]
            )
            db.add(action_reason)
            db.flush()
            notes_id = action_reason.id

        result = approval_service.action_approval(
            db, approval.id, current_user.id, approve=False, notes_id=notes_id
        )
        return success_response(data={"approval_id": result.id}, message="Booking rejected")
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
