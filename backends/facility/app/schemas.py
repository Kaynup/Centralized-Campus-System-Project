from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, Dict, Any
from datetime import datetime, date, time
from uuid import UUID
from app.models import FacilityGroup, BookingStatus, ApprovalStatus, LogLevel
class BookingCreate(BaseModel):
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
    reason: Optional[str] = None

class ApproveRejectPayload(BaseModel):
    notes: Optional[str] = Field(None, max_length=1000)

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    booking_id: Optional[int] = None
    read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BookingListResponse(BaseModel):
    id: int
    facility_name: str
    facility_group: str
    date: str
    start_time: str
    end_time: str
    status: str
    deposit: float
    cancellation_reason: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FacilityBase(BaseModel):
    name: str = Field(..., max_length=100)
    facility_group: FacilityGroup
    capacity: int = Field(..., gt=0)
    requires_approval: int = 0
    token_cost_per_hour: float = Field(default=1.0, ge=0)
    description: Optional[str] = None
    is_active: bool = True

class FacilityResponse(FacilityBase):
    id: int

class SlotBase(BaseModel):
    start_time_of_day: time
    end_time_of_day: time
    is_peak_hour: bool = False

class SlotResponse(SlotBase):
    id: int

class BookingBase(BaseModel):
    user_id: Optional[UUID] = None
    facility_id: int
    booking_date: date
    start_slot_id: int
    end_slot_id: int
    status: BookingStatus = BookingStatus.PENDING
    deposit_paid: float = Field(default=0.0, ge=0)
    cancellation_reason_id: Optional[int] = None

class BookingResponse(BookingBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

class SystemLogBase(BaseModel):
    level: LogLevel
    action: str = Field(..., max_length=100)
    user_id: Optional[UUID] = None
    booking_id: Optional[int] = None
    message: str
    log_metadata: Optional[Dict[str, Any]] = None

class FacilityCalendarSlotResponse(SlotResponse):
    status: str
    booking_id: Optional[int] = None
    user_name: Optional[str] = None
    deposit: Optional[float] = None

class SystemLogResponse(SystemLogBase):
    id: int
    created_at: datetime
class ActionReasonBase(BaseModel):
    action_label: str = Field(..., max_length=100)
    reason_statement: str = Field(..., max_length=255)

class ActionReasonResponse(ActionReasonBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ApprovalBase(BaseModel):
    booking_id: int
    approver_id: Optional[UUID] = None
    status: ApprovalStatus = ApprovalStatus.PENDING
    notes_id: Optional[int] = None

class ApprovalResponse(ApprovalBase):
    id: int
    requested_at: datetime
    actioned_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class UnavailabilityBase(BaseModel):
    facility_id: int
    booking_date: date
    start_slot_id: int
    end_slot_id: int
    reason_id: Optional[int] = None



class UnavailabilityResponse(UnavailabilityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
