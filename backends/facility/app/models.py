import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Time, Enum as SAEnum,
    ForeignKey, Float, Integer, JSON, String, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

# Enums
class FacilityGroup(str, enum.Enum):
    Courts = "Courts"
    Classrooms = "Classrooms"
    Labs = "Labs"
    Halls = "Halls"

class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESERVED = "RESERVED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    NO_SHOW = "NO_SHOW"

class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class LogLevel(str, enum.Enum):
    INFO = "INFO"
    DEBUG = "DEBUG"
    WARNING = "WARNING"
    ERROR = "ERROR"

class ActionContext(str, enum.Enum):
    USER_CANCELLATION = "USER_CANCELLATION"
    ADMIN_CANCELLATION = "ADMIN_CANCELLATION"
    ADMIN_MAINTENANCE = "ADMIN_MAINTENANCE"
    APPROVAL_NOTES = "APPROVAL_NOTES"
    REJECTION_NOTES = "REJECTION_NOTES"

# Models
class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    facility_group = Column(SAEnum(FacilityGroup, native_enum=True, name="facilitygroup"), nullable=False)
    capacity = Column(Integer, nullable=False)
    requires_approval = Column(Integer, default=0, nullable=False)
    token_cost_per_hour = Column(Float, nullable=False, default=1.0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time_of_day = Column(Time, nullable=False)
    end_time_of_day = Column(Time, nullable=False)
    is_peak_hour = Column(Boolean, default=False, nullable=False)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_date = Column(Date, nullable=False, index=True)
    start_slot_id = Column(Integer, ForeignKey("slots.id", ondelete="RESTRICT"), nullable=False)
    end_slot_id = Column(Integer, ForeignKey("slots.id", ondelete="RESTRICT"), nullable=False)
    status = Column(SAEnum(BookingStatus, native_enum=True, name="bookingstatus"), nullable=False, default=BookingStatus.PENDING)
    deposit_paid = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)
    cancellation_reason_id = Column(Integer, ForeignKey("action_reasons.id", ondelete="SET NULL"), nullable=True)

    facility = relationship("Facility", backref="bookings")
    start_slot = relationship("Slot", foreign_keys=[start_slot_id])
    end_slot = relationship("Slot", foreign_keys=[end_slot_id])
    approval = relationship("Approval", back_populates="booking", uselist=False, lazy="select")
    cancellation_reason = relationship("ActionReason", foreign_keys=[cancellation_reason_id])

class Unavailability(Base):
    __tablename__ = "unavailabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_date = Column(Date, nullable=False, index=True)
    start_slot_id = Column(Integer, ForeignKey("slots.id", ondelete="RESTRICT"), nullable=False)
    end_slot_id = Column(Integer, ForeignKey("slots.id", ondelete="RESTRICT"), nullable=False)
    reason_id = Column(Integer, ForeignKey("action_reasons.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    facility = relationship("Facility")
    start_slot = relationship("Slot", foreign_keys=[start_slot_id])
    end_slot = relationship("Slot", foreign_keys=[end_slot_id])
    reason = relationship("ActionReason")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True)
    approver_id = Column(String(36), nullable=True)
    status = Column(SAEnum(ApprovalStatus, native_enum=True, name="approvalstatus"), nullable=False, default=ApprovalStatus.PENDING)
    notes_id = Column(Integer, ForeignKey("action_reasons.id", ondelete="SET NULL"), nullable=True)
    requested_at = Column(DateTime, default=func.now(), nullable=False)
    actioned_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="approval")
    notes = relationship("ActionReason", foreign_keys=[notes_id])

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(SAEnum(LogLevel, native_enum=True, name="loglevel"), nullable=False)
    action = Column(String(100), nullable=False)
    user_id = Column(String(36), nullable=True)
    booking_id = Column(Integer, nullable=True)
    message = Column(Text, nullable=False)
    log_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

class ActionReason(Base):
    __tablename__ = "action_reasons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_label = Column(String(100), nullable=False, unique=True)
    reason_statement = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    booking_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    @property
    def read(self):
        return self.is_read
