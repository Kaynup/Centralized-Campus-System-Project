"""
app/db/schemas.py
─────────────────
Pydantic v2 schemas for request validation and response serialization.

Conventions:
  - *Create / *Login / *Action  — request bodies (input)
  - *Out                        — response models (output)
  - All response schemas use  model_config = ConfigDict(from_attributes=True)
    so they can be constructed directly from SQLAlchemy ORM objects.
"""

from __future__ import annotations

from datetime import date, datetime, time
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from pydantic.alias_generators import to_camel

from app.db.models import (
    ApprovalStatus,
    BookingStatus,
    FacilityGroup,
    LogLevel,
    TransactionType,
    UserRole,
)


# ══════════════════════════════════════════════════════════════════════════════
# Request Schemas  (input / validation)
# ══════════════════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    """Payload for POST /api/v1/auth/register."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Jane Smith"])
    password: str = Field(..., min_length=8, examples=["s3cur3P@ssword"])
    role: UserRole = UserRole.student


class UserLogin(BaseModel):
    """Payload for POST /api/v1/auth/login."""
    email: EmailStr
    password: str


class BookingCreate(BaseModel):
    """
    Payload for POST /api/v1/bookings.
    """
    facility_id: int
    booking_date: date
    start_slot_id: int
    end_slot_id: int

    @model_validator(mode='after')
    def validate_slots(self):
        if self.end_slot_id < self.start_slot_id:
            raise ValueError("end_slot_id must be >= start_slot_id")
        return self


class CancellationRequest(BaseModel):
    """Payload for POST /api/v1/bookings/{id}/cancel."""
    reason: Optional[str] = None


class ApprovalAction(BaseModel):
    """
    Payload for POST /api/v1/approvals/{id}/action.
    action must be APPROVED or REJECTED (not PENDING).
    """
    action: ApprovalStatus
    notes: Optional[str] = Field(None, max_length=1000)


class ApproveRejectPayload(BaseModel):
    """Payload for POST /api/v1/bookings/{id}/approve and /reject."""
    notes: Optional[str] = Field(None, max_length=1000)


class TokenGrant(BaseModel):
    """Payload for POST /api/v1/tokens/grant  (admin only)."""
    user_id: int = Field(..., gt=0)
    amount: float = Field(..., gt=0, le=1000, description="Tokens to add (up to 1000)")
    reason: str = Field(..., min_length=3, max_length=255)


# ══════════════════════════════════════════════════════════════════════════════
# Response Schemas  (output / serialization)
# ══════════════════════════════════════════════════════════════════════════════

class UserOut(BaseModel):
    """Public user representation — never includes hashed_password."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    full_name: str
    email: str
    role: UserRole
    token_balance: float
    is_active: bool
    pref_email_notifications: bool
    pref_inapp_notifications: bool
    pref_booking_reminders: bool
    created_at: datetime


class UserPreferencesUpdate(BaseModel):
    """Payload for PATCH /api/v1/auth/me/preferences."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    pref_email_notifications: Optional[bool] = None
    pref_inapp_notifications: Optional[bool] = None
    pref_booking_reminders: Optional[bool] = None
class FacilityOut(BaseModel):
    """Full facility representation returned to API clients."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    name: str
    facility_group: FacilityGroup
    capacity: int
    requires_approval: int
    token_cost_per_hour: float
    description: Optional[str]
    is_active: bool


class SlotOut(BaseModel):
    """Single time-slot block for the daily grid."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    start_time_of_day: time
    end_time_of_day: time
    is_peak_hour: bool


class FacilityCalendarSlotOut(SlotOut):
    """Enriched slot representing its state on a specific date."""
    status: str
    booking_id: Optional[int] = None
    user_name: Optional[str] = None
    deposit: Optional[float] = None


class BookingOut(BaseModel):
    """Booking record returned after creation or status queries."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    user_id: int
    facility_id: int
    booking_date: date
    start_slot_id: int
    end_slot_id: int
    status: str
    deposit_paid: float
    created_at: datetime
    updated_at: Optional[datetime]
    cancellation_reason_id: Optional[int]

    @model_validator(mode='after')
    def map_reserved_to_active(self):
        """Map RESERVED status to ACTIVE for frontend compatibility."""
        if self.status == 'RESERVED' or self.status == BookingStatus.RESERVED:
            self.status = 'ACTIVE'
        return self


class BookingDetailOut(BookingOut):
    """Extended booking response that nests slot and approval info."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    start_slot: Optional[SlotOut] = None
    end_slot: Optional[SlotOut] = None
    approval: Optional["ApprovalOut"] = None


class BookingListOut(BaseModel):
    """Booking with joined slot+facility data — used by GET /api/v1/bookings list."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    facility_name: str
    facility_group: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    status: str  # ACTIVE / PENDING / CANCELLED / COMPLETED / REJECTED
    deposit: float  # maps from deposit_paid
    cancellation_reason: Optional[str] = None


class CancellationPreviewOut(BaseModel):
    """Preview of refund amounts before confirming cancellation."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    refund_amount: float
    penalty_amount: float
    refund_pct: int
    penalty_pct: int
    hours_until_start: float


class TransactionOut(BaseModel):
    """Single ledger entry for a user's token history."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    type: TransactionType
    amount: float
    balance_after: float
    description: Optional[str]
    booking_id: Optional[int]
    transaction_at: datetime


class ApprovalOut(BaseModel):
    """Approval workflow record."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    booking_id: int
    status: ApprovalStatus
    approver_id: Optional[int]
    notes_id: Optional[int]
    requested_at: datetime
    actioned_at: Optional[datetime]


class ApprovalDetailOut(BaseModel):
    """Approval with joined requester + facility + slot data for the dashboard."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    booking_id: int
    requester_name: str
    requester_email: str
    facility_name: str
    facility_group: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    requested_at: datetime
    status: ApprovalStatus
    notes: Optional[str] = None


class TokenBalanceOut(BaseModel):
    """
    Returned by GET /api/v1/tokens/balance.
    Includes the last 10 transactions for a quick ledger preview.
    """
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    user_id: int
    balance: float
    recent_transactions: List[TransactionOut] = []


class NotificationOut(BaseModel):
    """User-facing notification entry."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    type: str
    title: str
    message: str
    booking_id: Optional[int] = None
    read: bool
    created_at: datetime


class SystemLogOut(BaseModel):
    """Audit log entry — admin-facing."""
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    level: LogLevel
    action: str
    user_id: Optional[int]
    booking_id: Optional[int]
    message: str
    log_metadata: Optional[dict]
    created_at: datetime


# ── Forward-reference resolution (needed for nested schemas) ─────────────────
BookingDetailOut.model_rebuild()


# ══════════════════════════════════════════════════════════════════════════════
# Auth response wrapper
# ══════════════════════════════════════════════════════════════════════════════

class LoginResponse(BaseModel):
    """Returned by POST /api/v1/auth/login."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    """Generic success message wrapper."""
    message: str
    detail: Optional[str] = None
