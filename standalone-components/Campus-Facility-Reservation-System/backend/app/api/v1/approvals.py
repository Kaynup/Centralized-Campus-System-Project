"""
app/api/v1/approvals.py
────────────────────────
Approval workflow endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import ApprovalOut, ApprovalAction, ApprovalDetailOut
from app.core.security import require_admin
from app.services import approval_service
from app.db import crud
from app.db.models import ApprovalStatus

router = APIRouter(prefix="/approvals", tags=["Approvals"])


def _enrich_approval(approval) -> ApprovalDetailOut:
    """Convert Approval record to enriched ApprovalDetailOut with joined data."""
    booking = approval.booking
    facility = booking.facility if booking else None
    user = booking.user if booking else None
    start_slot = booking.start_slot if booking else None
    end_slot = booking.end_slot if booking else None

    return ApprovalDetailOut(
        id=approval.id,
        booking_id=approval.booking_id,
        requester_name=user.full_name if user else "Unknown",
        requester_email=user.email if user else "Unknown",
        facility_name=facility.name if facility else "Unknown",
        facility_group=facility.facility_group.value if facility else "Unknown",
        date=booking.booking_date.strftime('%Y-%m-%d') if booking else "",
        start_time=start_slot.start_time_of_day.strftime('%H:%M') if start_slot else "",
        end_time=end_slot.end_time_of_day.strftime('%H:%M') if end_slot else "",
        requested_at=approval.requested_at,
        status=approval.status,
        notes=approval.notes.reason_statement if approval.notes else None,
    )


@router.get("", response_model=List[ApprovalOut], response_model_by_alias=True, summary="List approvals")
def list_approvals(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """List all pending approvals."""
    approvals = approval_service.get_pending_approvals(db)
    return list(approvals)


@router.get("/pending", response_model=List[ApprovalDetailOut], response_model_by_alias=True, summary="List pending approvals")
def list_pending_approvals(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Frontend calls GET /api/v1/approvals/pending — alias for enriched approval list."""
    approvals = crud.get_pending_approvals(db)
    return [_enrich_approval(a) for a in approvals]


@router.post("/{approval_id}/action", response_model=ApprovalOut, response_model_by_alias=True, summary="Take action on approval")
def action_approval(
    approval_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    approve = action.action == ApprovalStatus.APPROVED

    try:
        # action.notes is now being mapped to notes_id in the new schema but the pydantic model still calls it "notes"
        # actually, I changed it to notes_id in some schemas, let's just pass it to the service
        # if the frontend passes an integer ID in the "notes" or "notes_id" field.
        notes_id = None
        if hasattr(action, 'notes_id'):
             notes_id = action.notes_id
        elif hasattr(action, 'notes'):
             try:
                 notes_id = int(action.notes)
             except (ValueError, TypeError):
                 pass

        approval = approval_service.action_approval(
            db,
            approval_id,
            approver_id=current_user.id,
            approve=approve,
            notes_id=notes_id,
        )
        return approval
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
