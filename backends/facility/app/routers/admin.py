"""
app/routers/admin.py
────────────────────
Admin-only endpoints for the Facility microservice.

Routes (all under /api/v1/admin):
  GET  /logs                  — Paginated system logs
  GET  /bookings/pending      — Pending bookings awaiting approval
  POST /facilities/{id}/unavailability  — Mark a facility as unavailable
"""

from typing import Optional
from datetime import date as _date

import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.models import SystemLog, Booking, BookingStatus, Facility, Unavailability, ActionReason
from app.envelope import success_response
from app.core.security import require_admin, require_professor_or_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/logs", response_model=dict)
def get_system_logs(
    level: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_professor_or_admin),
):
    """Return paginated system event logs. Accessible by professor or admin."""
    query = db.query(SystemLog)

    if level:
        query = query.filter(SystemLog.level == level)

    if date:
        query = query.filter(SystemLog.created_at >= f"{date} 00:00:00")
        query = query.filter(SystemLog.created_at <= f"{date} 23:59:59")

    total = query.count()
    pages = (total + limit - 1) // limit

    logs = (
        query.order_by(SystemLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    formatted_logs = [
        {
            "id": log.id,
            "level": log.level.value if hasattr(log.level, "value") else log.level,
            "action": log.action,
            "userId": log.user_id,
            "userEmail": log.user_id,
            "message": log.message,
            "createdAt": log.created_at.isoformat(),
        }
        for log in logs
    ]

    return {
        "logs": formatted_logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/bookings/pending", response_model=dict)
def get_pending_bookings(
    facility_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_professor_or_admin),
):
    """
    Return all bookings with PENDING status (awaiting approval).
    Used by the ApprovalDashboardPage in the standalone frontend.
    """
    query = db.query(Booking).filter(Booking.status == BookingStatus.PENDING)

    if facility_id:
        query = query.filter(Booking.facility_id == facility_id)

    bookings = query.order_by(Booking.created_at.desc()).all()

    result = []
    for b in bookings:
        facility = b.facility
        result.append(
            {
                "id": b.id,
                "user_id": b.user_id,
                "facility_id": b.facility_id,
                "facility_name": facility.name if facility else "Unknown",
                "facility_group": facility.facility_group.value if facility else "Unknown",
                "booking_date": b.booking_date.strftime("%Y-%m-%d") if b.booking_date else "",
                "start_time": (
                    b.start_slot.start_time_of_day.strftime("%H:%M") if b.start_slot else ""
                ),
                "end_time": (
                    b.end_slot.end_time_of_day.strftime("%H:%M") if b.end_slot else ""
                ),
                "status": b.status.value,
                "deposit": b.deposit_paid,
                "created_at": b.created_at.isoformat(),
            }
        )

    return {"bookings": result, "total": len(result)}


@router.post("/facilities/{facility_id}/unavailability", response_model=dict, status_code=status.HTTP_201_CREATED)
def mark_facility_unavailable(
    facility_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """
    Block a time window on a facility as unavailable (e.g., maintenance).
    Payload: { booking_date, start_slot_id, end_slot_id, reason }
    """
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    reason_id = None
    if payload.get("reason"):
        reason = ActionReason(
            action_label=f"MAINT_{uuid.uuid4().hex[:8]}",
            reason_statement=payload["reason"][:255],
        )
        db.add(reason)
        db.flush()
        reason_id = reason.id

    unavailability = Unavailability(
        facility_id=facility_id,
        booking_date=_date.fromisoformat(payload["booking_date"]),
        start_slot_id=payload["start_slot_id"],
        end_slot_id=payload["end_slot_id"],
        reason_id=reason_id,
    )
    db.add(unavailability)
    db.commit()
    db.refresh(unavailability)

    return success_response(
        data={"unavailability_id": unavailability.id},
        message="Facility marked as unavailable",
    )
