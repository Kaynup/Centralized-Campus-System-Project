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
from app.logger import log_action

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

    user_ids = list(set([b.user_id for b in bookings]))
    users_info = {}
    if user_ids:
        # Prevent SQLAlchemy text IN clause expansion issues
        uids_str = ",".join(f"'{uid}'" for uid in user_ids)
        result = db.execute(text(f"SELECT id, full_name, email FROM users WHERE id IN ({uids_str})")).fetchall()
        for row in result:
            users_info[str(row[0])] = {"name": row[1], "email": row[2]}

    result = []
    for b in bookings:
        facility = b.facility
        u_info = users_info.get(str(b.user_id), {"name": "Unknown", "email": "unknown@example.com"})
        result.append(
            {
                "id": b.id,
                "user_id": b.user_id,
                "requester_name": u_info["name"],
                "requester_email": u_info["email"],
                "facility_id": b.facility_id,
                "facility_name": facility.name if facility else "Unknown",
                "facility_group": (facility.facility_group.value if hasattr(facility.facility_group, "value") else facility.facility_group) if facility else "Unknown",
                "booking_date": b.booking_date.strftime("%Y-%m-%d") if b.booking_date else "",
                "start_time": (
                    b.start_slot.start_time_of_day.strftime("%H:%M") if b.start_slot else ""
                ),
                "end_time": (
                    b.end_slot.end_time_of_day.strftime("%H:%M") if b.end_slot else ""
                ),
                "status": b.status.value if hasattr(b.status, "value") else b.status,
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

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    total_bookings = db.query(Booking).count()
    completed = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()
    cancelled = db.query(Booking).filter(Booking.status == BookingStatus.CANCELLED).count()
    pending = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    reserved = db.query(Booking).filter(Booking.status == BookingStatus.RESERVED).count()

    total_users = db.execute(text("SELECT COUNT(id) FROM users WHERE role = 'student'")).scalar() or 0
    total_tokens = db.execute(text("SELECT SUM(token_balance) FROM wallets")).scalar() or 0

    return {
        "total_bookings": total_bookings,
        "completed_bookings": completed,
        "cancelled_bookings": cancelled,
        "pending_bookings": pending,
        "reserved_bookings": reserved,
        "total_users": total_users,
        "total_tokens_in_circulation": float(total_tokens)
    }

@router.patch("/bookings/{booking_id}/force-cancel")
def force_cancel_booking(booking_id: int, payload: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Cannot cancel in this state")
    
    import app.services as services
    try:
        services.execute_cancellation(db, booking.id, booking.user_id, reason=payload.get("reason", "Admin Force Cancel"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return success_response(message="Force cancelled")

@router.post("/slots/toggle-availability")
def toggle_slots(payload: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    facility_id = payload.get("facility_id")
    booking_date = payload.get("booking_date")
    slot_ids = payload.get("slot_ids", [])
    action = payload.get("action")
    reason = payload.get("reason", "Admin toggle")
    
    if not all([facility_id, booking_date, slot_ids, action]):
        raise HTTPException(status_code=400, detail="Missing fields")
    
    b_date = _date.fromisoformat(booking_date)
    
    if action == "lock":
        reason_obj = ActionReason(action_label=f"TOGGLE_{uuid.uuid4().hex[:8]}", reason_statement=reason[:255])
        db.add(reason_obj)
        db.flush()
        
        for s_id in slot_ids:
            u = Unavailability(facility_id=facility_id, booking_date=b_date, start_slot_id=s_id, end_slot_id=s_id, reason_id=reason_obj.id)
            db.add(u)
    else:
        for s_id in slot_ids:
            db.query(Unavailability).filter(
                Unavailability.facility_id == facility_id, 
                Unavailability.booking_date == b_date,
                Unavailability.start_slot_id <= s_id,
                Unavailability.end_slot_id >= s_id
            ).delete()
    
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user.id,
        action_type=f"SLOTS_{action.upper()}",
        description=f"Admin {action}ed {len(slot_ids)} slots for facility {facility_id}",
        facility_id=facility_id
    )
    
    return success_response(message=f"Slots {action}ed")

@router.get("/history")
def get_slot_history(facility_id: int, date: str, slot_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    b_date = _date.fromisoformat(date)
    bookings = db.query(Booking).filter(
        Booking.facility_id == facility_id, 
        Booking.booking_date == b_date,
        Booking.start_slot_id <= slot_id,
        Booking.end_slot_id >= slot_id
    ).all()
    
    history = []
    for b in bookings:
        history.append({
            "booking_id": b.id,
            "status": b.status.value,
            "user_id": b.user_id,
            "created_at": b.created_at.isoformat()
        })
    return {"history": history}

