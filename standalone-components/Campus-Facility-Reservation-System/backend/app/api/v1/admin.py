"""
app/api/v1/admin.py
────────────────────
Admin-only endpoints: system logs.
"""

import uuid
from typing import Optional, List
from fastapi import APIRouter, Body, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from math import ceil

from app.db.session import get_db
from app.db.schemas import SystemLogOut, UserOut, CancellationRequest
from app.db.models import SystemLog, Booking, BookingStatus, User, Transaction, TransactionType, ActionReason, ActionContext, LogLevel, Unavailability
from datetime import date
from app.core.security import require_admin
from app.db import crud
from app.services import cancellation_service
from app.utils.response_helpers import success_response

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/logs", response_model_by_alias=True, summary="Get system logs", responses={403: {"description": "Admin access required"}})
def get_system_logs(
    level: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    GET /api/v1/admin/logs
    Frontend calls this with: level, page, limit, date (YYYY-MM-DD)
    Returns: { logs: [], total: N, pages: N }
    """
    skip = (page - 1) * limit

    # Build query with filters
    count_query = db.query(SystemLog)
    logs_query = db.query(SystemLog)

    if level:
        from app.db.models import LogLevel
        try:
            level_enum = LogLevel(level.upper())
            count_query = count_query.filter(SystemLog.level == level_enum)
            logs_query = logs_query.filter(SystemLog.level == level_enum)
        except ValueError:
            pass

    if date:
        from datetime import datetime as dt, timedelta
        try:
            day_start = dt.strptime(date, "%Y-%m-%d")
            day_end = day_start + timedelta(days=1)
            count_query = count_query.filter(
                SystemLog.created_at >= day_start,
                SystemLog.created_at < day_end
            )
            logs_query = logs_query.filter(
                SystemLog.created_at >= day_start,
                SystemLog.created_at < day_end
            )
        except ValueError:
            pass

    # Get total count
    total = count_query.count()
    pages = ceil(total / limit) if total > 0 else 1

    # Get paginated logs
    logs = logs_query.order_by(SystemLog.created_at.desc()).offset(skip).limit(limit).all()

    # Convert to schemas
    result_logs = []
    for log in logs:
        log_dict = SystemLogOut.model_validate(log).model_dump(by_alias=True)
        # Optional: Add user name/email if user_id is set
        if log.user_id:
            user = crud.get_user_by_id(db, log.user_id)
            if user:
                log_dict['userName'] = user.full_name
                log_dict['userEmail'] = user.email
            else:
                log_dict['userName'] = 'System'
                log_dict['userEmail'] = None
        else:
            log_dict['userName'] = 'System'
            log_dict['userEmail'] = None
        result_logs.append(log_dict)

    return {
        "logs": result_logs,
        "total": total,
        "pages": pages,
    }


@router.get("/stats", response_model=dict, response_model_by_alias=True, summary="Get admin statistics", responses={403: {"description": "Admin access required"}})
def get_admin_stats(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    total_bookings = db.query(func.count(Booking.id)).scalar() or 0
    reserved_count = db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.RESERVED).scalar() or 0
    pending_count = db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.PENDING).scalar() or 0
    cancelled_count = db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.CANCELLED).scalar() or 0
    rejected_count = db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.REJECTED).scalar() or 0
    no_show_count = db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.NO_SHOW).scalar() or 0
    completed_count = db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.COMPLETED).scalar() or 0

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
    total_deposited = db.query(func.sum(Transaction.amount)).filter(Transaction.type == TransactionType.DEPOSIT).scalar() or 0
    total_refunded = db.query(func.sum(Transaction.amount)).filter(Transaction.type == TransactionType.REFUND).scalar() or 0
    total_penalties = db.query(func.sum(Transaction.amount)).filter(Transaction.type == TransactionType.PENALTY).scalar() or 0

    cancellation_rate = (
        (cancelled_count + rejected_count + no_show_count) / total_bookings * 100
        if total_bookings > 0 else 0
    )

    return success_response(
        data={
            "total_bookings": total_bookings,
            "reserved_count": reserved_count,
            "pending_count": pending_count,
            "cancelled_count": cancelled_count,
            "rejected_count": rejected_count,
            "no_show_count": no_show_count,
            "completed_count": completed_count,
            "total_users": total_users,
            "total_transactions": total_transactions,
            "total_deposited": total_deposited,
            "total_refunded": total_refunded,
            "total_penalties": total_penalties,
            "cancellation_rate": round(cancellation_rate, 2),
        },
        message="Admin stats retrieved",
    )


@router.get("/users", response_model=List[UserOut], response_model_by_alias=True, summary="List users for admin", responses={403: {"description": "Admin access required"}})
def get_admin_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    users = crud.get_all_users(db, skip=skip, limit=limit)
    return users

@router.patch("/bookings/{booking_id}/force-cancel", response_model=dict, response_model_by_alias=True, summary="Force-cancel a booking as admin", responses={403: {"description": "Admin access required"}, 400: {"description": "Bad request"}})
def force_cancel_booking(
    booking_id: int,
    payload: Optional[CancellationRequest] = None,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    try:
        reason_id = None
        if payload and payload.reason:
            action_reason = ActionReason(
                action_label=f"CUSTOM_ADC_{uuid.uuid4().hex[:8]}",
                reason_statement=payload.reason[:255]
            )
            db.add(action_reason)
            db.flush()
            reason_id = action_reason.id

        preview = cancellation_service.execute_cancellation_as_admin(db, booking_id, admin_user.id, reason_id=reason_id)
        return success_response(data={"refund": preview}, message="Booking force-cancelled")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
class ToggleSlotsRequest(BaseModel):
    facility_id: int
    booking_date: date
    slot_ids: List[int]
    is_available: bool
    reason: str

@router.post("/slots/toggle-availability", summary="Admin toggle slot availability")
def toggle_slots(
    payload: ToggleSlotsRequest,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    try:
        # Group slot_ids into contiguous blocks
        sorted_slots = sorted(payload.slot_ids)
        if not sorted_slots:
            return success_response(message="No slots provided")

        blocks = []
        current_start = sorted_slots[0]
        current_end = sorted_slots[0]
        for s in sorted_slots[1:]:
            if s == current_end + 1:
                current_end = s
            else:
                blocks.append((current_start, current_end))
                current_start = s
                current_end = s
        blocks.append((current_start, current_end))

        if not payload.is_available:
            if not payload.reason:
                raise ValueError("Reason is required when making slots unavailable")
            action_reason = ActionReason(
                action_label=f"CUSTOM_MNT_{uuid.uuid4().hex[:8]}",
                reason_statement=payload.reason[:255]
            )
            db.add(action_reason)
            db.flush()

            for start_s, end_s in blocks:
                unavailability = Unavailability(
                    facility_id=payload.facility_id,
                    booking_date=payload.booking_date,
                    start_slot_id=start_s,
                    end_slot_id=end_s,
                    reason_id=action_reason.id
                )
                db.add(unavailability)
        else:
            # Make available: remove overlapping unavailabilities
            for start_s, end_s in blocks:
                db.query(Unavailability).filter(
                    Unavailability.facility_id == payload.facility_id,
                    Unavailability.booking_date == payload.booking_date,
                    Unavailability.start_slot_id <= end_s,
                    Unavailability.end_slot_id >= start_s
                ).delete()

        db.commit()

        # Create system audit log
        status_text = "AVAILABLE" if payload.is_available else "UNAVAILABLE"
        audit_log = SystemLog(
            level=LogLevel.INFO,
            action="SLOT_STATUS_TOGGLED",
            user_id=admin_user.id,
            message=f"Admin {admin_user.email} marked {len(payload.slot_ids)} slots as {status_text}.",
            log_metadata={
                "slot_ids": payload.slot_ids,
                "is_available": payload.is_available,
                "reason": payload.reason
            }
        )
        db.add(audit_log)

        db.commit()
        return success_response(message="Slots toggled successfully")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history", summary="Get historical details for a slot on a specific date")
def get_slot_history(
    facility_id: int,
    date: date,
    slot_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    slot = crud.get_slot_by_id(db, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    overlapping_bookings = db.query(Booking).filter(
        Booking.facility_id == facility_id,
        Booking.booking_date == date,
        Booking.start_slot_id <= slot_id,
        Booking.end_slot_id >= slot_id
    ).all()

    bookings = []
    for b in overlapping_bookings:
        user = b.user
        c_reason = b.cancellation_reason.reason_statement if b.cancellation_reason else None
        bookings.append({
            "id": b.id,
            "status": b.status.value,
            "userName": user.full_name if user else "Unknown",
            "userEmail": user.email if user else "Unknown",
            "depositPaid": b.deposit_paid,
            "cancellationReason": c_reason
        })

    unavail = db.query(Unavailability).filter(
        Unavailability.facility_id == facility_id,
        Unavailability.date == date,
        Unavailability.start_slot_id <= slot_id,
        Unavailability.end_slot_id >= slot_id
    ).first()

    u_reason = unavail.reason.reason_statement if (unavail and unavail.reason) else None
    is_available = unavail is None

    return success_response(data={
        "id": slot.id,
        "is_available": is_available,
        "start_time": slot.start_time_of_day.strftime("%H:%M"),
        "end_time": slot.end_time_of_day.strftime("%H:%M"),
        "unavailabilityReason": u_reason,
        "bookings": bookings
    }, message="Slot history retrieved")

from fastapi import UploadFile, File
from app.services import user_service

@router.post("/users/bulk-upload", response_model=dict, summary="Bulk upload users via CSV", responses={403: {"description": "Admin access required"}})
async def bulk_upload_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    try:
        content = await file.read()
        text_content = content.decode("utf-8")
        result = user_service.bulk_create_users(db, text_content)
        
        crud.create_log(
            db,
            level="INFO",
            action="BULK_UPLOAD_USERS",
            message=f"Bulk uploaded {result.get('created', 0)} users from CSV",
            user_id=current_admin.id,
        )
        
        return success_response(data=result, message="Bulk upload completed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class TopUpRequest(BaseModel):
    amount: float

@router.post("/users/{user_id}/topup", summary="Top up user's tokens", responses={403: {"description": "Admin access required"}})
def top_up_user(
    user_id: int,
    payload: TopUpRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin)
):
    try:
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise ValueError("User not found")
            
        amount = payload.amount
        if amount <= 0:
            raise ValueError("Amount must be positive")
            
        user.token_balance += amount
        
        tx = Transaction(
            type=TransactionType.GRANT,
            amount=amount,
            balance_after=user.token_balance,
            description="Admin top-up",
            transaction_at=func.now()
        )
        user.transactions.append(tx)
        
        crud.create_notification(
            db,
            user_id=user.id,
            type="top_up",
            title="Tokens Added",
            message=f"An admin has added {amount} tokens to your account. Your new balance is {user.token_balance}.",
            commit=False
        )
        
        crud.create_log(
            db,
            level="INFO",
            action="USER_TOP_UP",
            message=f"Admin {current_admin.email} topped up {amount} tokens for user {user.email}",
            user_id=current_admin.id,
            commit=False
        )
        
        db.commit()
        return success_response(message="Top-up successful")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class BulkTopUpRequest(BaseModel):
    target_group: str  # ALL, STUDENTS, PROFESSORS
    amount: float

@router.post("/users/bulk-topup", summary="Bulk top up users", responses={403: {"description": "Admin access required"}})
def bulk_top_up_users(
    payload: BulkTopUpRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin)
):
    try:
        amount = payload.amount
        if amount <= 0:
            raise ValueError("Amount must be positive")
            
        query = db.query(User)
        if payload.target_group == "STUDENTS":
            query = query.filter(User.role == "student")
        elif payload.target_group == "PROFESSORS":
            query = query.filter(User.role == "professor")
            
        users = query.all()
        count = 0
        for user in users:
            user.token_balance += amount
            
            tx = Transaction(
                type=TransactionType.GRANT,
                amount=amount,
                balance_after=user.token_balance,
                description=f"Universal top-up ({payload.target_group})",
                transaction_at=func.now()
            )
            user.transactions.append(tx)
            
            crud.create_notification(
                db,
                user_id=user.id,
                type="top_up",
                title="Tokens Added",
                message=f"An admin has applied a universal top-up of {amount} tokens to your account. Your new balance is {user.token_balance}.",
                commit=False
            )
            count += 1
            
        crud.create_log(
            db,
            level="INFO",
            action="BULK_TOP_UP",
            message=f"Admin {current_admin.email} topped up {amount} tokens for {count} {payload.target_group} users",
            user_id=current_admin.id,
            commit=False
        )
        
        db.commit()
        return success_response(data={"users_affected": count}, message="Bulk top-up successful")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

