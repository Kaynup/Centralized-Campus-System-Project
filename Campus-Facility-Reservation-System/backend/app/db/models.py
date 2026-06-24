"""
app/db/models.py
────────────────
SQLAlchemy ORM models for the Campus Facility Reservation System.

Tables:
  users          — accounts, roles, token balances
  facilities     — bookable spaces (courts, rooms, labs, halls)
  slots          — 30-min time windows per facility
  bookings       — reservation records linking users ↔ slots
  transactions   — immutable token ledger
  approvals      — sign-off records for bookings that need approval
  system_logs    — audit log for all significant events

All models inherit from Base (app.db.base).
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Time,
    Enum as SAEnum,
    ForeignKey,
    Float,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


# ══════════════════════════════════════════════════════════════════════════════
# Python Enums  (str + enum.Enum so values serialize as plain strings)
# ══════════════════════════════════════════════════════════════════════════════

class UserRole(str, enum.Enum):
    student = "student"
    professor = "professor"
    admin = "admin"


    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            return cls.__members__.get(normalized)
        return None


class UserRoleType(TypeDecorator):
    """SQLAlchemy type that normalizes UserRole enum values on bind and result."""
    impl = SAEnum(UserRole, native_enum=True, name="userrole")
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value.value
        if isinstance(value, str):
            return UserRole(value.strip().lower()).value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value
        if isinstance(value, str):
            try:
                return UserRole(value)
            except ValueError:
                return UserRole(value.strip().lower())
        return value


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


class TransactionType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    REFUND = "REFUND"
    PENALTY = "PENALTY"
    GRANT = "GRANT"
    DEDUCTION = "DEDUCTION"


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


# ══════════════════════════════════════════════════════════════════════════════
# Model: User
# ══════════════════════════════════════════════════════════════════════════════

class User(Base):
    """
    Application user.  Roles: student, professor, admin.
    token_balance is updated atomically — every change is mirrored
    in the transactions table.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        UserRoleType(),
        nullable=False,
        default=UserRole.student,
    )
    token_balance = Column(Float, nullable=False, default=0.0)
    
    # Preferences
    pref_email_notifications = Column(Boolean, nullable=False, default=True)
    pref_inapp_notifications = Column(Boolean, nullable=False, default=True)
    pref_booking_reminders = Column(Boolean, nullable=False, default=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # ── Relationships ─────────────────────────────────────────────────────────
    bookings = relationship(
        "Booking",
        back_populates="user",
        foreign_keys="Booking.user_id",
        lazy="select",
    )
    transactions = relationship(
        "Transaction",
        back_populates="user",
        lazy="select",
    )
    approvals_given = relationship(
        "Approval",
        back_populates="approver",
        foreign_keys="Approval.approver_id",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"


# ══════════════════════════════════════════════════════════════════════════════
# Model: Facility
# ══════════════════════════════════════════════════════════════════════════════

class Facility(Base):
    """
    A physical space on campus that can be reserved.
    allowed_roles is stored as a JSON array: ["student", "professor"].
    """
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    facility_group = Column(
        SAEnum(FacilityGroup, native_enum=True, name="facilitygroup"),
        nullable=False,
    )
    capacity = Column(Integer, nullable=False)
    requires_approval = Column(Integer, default=0, nullable=False)
    token_cost_per_hour = Column(Float, nullable=False, default=1.0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return f"<Facility id={self.id} name={self.name!r} group={self.facility_group}>"


# ══════════════════════════════════════════════════════════════════════════════
# Model: Slot
# ══════════════════════════════════════════════════════════════════════════════

class Slot(Base):
    """
    A static daily template slot representing a 10-minute time window.
    Exactly 60 slots exist representing 07:00 to 17:00.
    """
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time_of_day = Column(Time, nullable=False)
    end_time_of_day = Column(Time, nullable=False)
    is_peak_hour = Column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return (
            f"<Slot id={self.id} "
            f"start={self.start_time_of_day} end={self.end_time_of_day} "
            f"peak={self.is_peak_hour}>"
        )


# ══════════════════════════════════════════════════════════════════════════════
# Model: Booking
# ══════════════════════════════════════════════════════════════════════════════

class Booking(Base):
    """
    Reservation record linking a User to a contiguous block of Slots on a specific date.
    deposit_paid: tokens held at booking time — used to calculate refund/penalty amounts.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    facility_id = Column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_date = Column(Date, nullable=False, index=True)
    start_slot_id = Column(
        Integer, ForeignKey("slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    end_slot_id = Column(
        Integer, ForeignKey("slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status = Column(
        SAEnum(BookingStatus, native_enum=True, name="bookingstatus"),
        nullable=False,
        default=BookingStatus.PENDING,
    )
    deposit_paid = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)
    cancellation_reason_id = Column(
        Integer, ForeignKey("action_reasons.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user = relationship(
        "User",
        back_populates="bookings",
        foreign_keys=[user_id],
    )
    facility = relationship("Facility", backref="bookings")
    start_slot = relationship("Slot", foreign_keys=[start_slot_id])
    end_slot = relationship("Slot", foreign_keys=[end_slot_id])
    transactions = relationship("Transaction", back_populates="booking", lazy="select")
    approval = relationship(
        "Approval",
        back_populates="booking",
        uselist=False,  # one-to-one
        lazy="select",
    )
    cancellation_reason = relationship("ActionReason", foreign_keys=[cancellation_reason_id])

    def __repr__(self) -> str:
        return (
            f"<Booking id={self.id} user={self.user_id} facility={self.facility_id} "
            f"date={self.booking_date} slots={self.start_slot_id}-{self.end_slot_id} status={self.status}>"
        )


# ══════════════════════════════════════════════════════════════════════════════
# Model: Unavailability
# ══════════════════════════════════════════════════════════════════════════════

class Unavailability(Base):
    """
    Administrative block marking slots as unavailable.
    """
    __tablename__ = "unavailabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_date = Column(Date, nullable=False, index=True)
    start_slot_id = Column(
        Integer, ForeignKey("slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    end_slot_id = Column(
        Integer, ForeignKey("slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason_id = Column(
        Integer, ForeignKey("action_reasons.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)

    facility = relationship("Facility")
    start_slot = relationship("Slot", foreign_keys=[start_slot_id])
    end_slot = relationship("Slot", foreign_keys=[end_slot_id])
    reason = relationship("ActionReason")

    def __repr__(self) -> str:
        return f"<Unavailability id={self.id} date={self.booking_date} facility={self.facility_id}>"


# ══════════════════════════════════════════════════════════════════════════════
# Model: Transaction
# ══════════════════════════════════════════════════════════════════════════════

class Transaction(Base):
    """
    Immutable token ledger row.

    Every change to users.token_balance must produce one row here.
    amount: positive = credit added, negative = debit taken.
    balance_after: snapshot of user balance after this transaction.
    booking_id: nullable — GRANT transactions are not tied to a booking.
    """
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_id = Column(
        Integer, ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    type = Column(
        SAEnum(TransactionType, native_enum=True, name="transactiontype"),
        nullable=False,
    )
    amount = Column(Float, nullable=False)           # positive = credit
    balance_after = Column(Float, nullable=False)    # snapshot
    description = Column(String(255), nullable=True)
    transaction_at = Column(DateTime, default=func.now(), nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    user = relationship("User", back_populates="transactions")
    booking = relationship("Booking", back_populates="transactions")

    def __repr__(self) -> str:
        return (
            f"<Transaction id={self.id} type={self.type} "
            f"amount={self.amount} balance_after={self.balance_after}>"
        )


# ══════════════════════════════════════════════════════════════════════════════
# Model: Approval
# ══════════════════════════════════════════════════════════════════════════════

class Approval(Base):
    """
    Approval workflow record.  Created when a booking needs sign-off.
    One approval record per booking (booking_id is unique).
    approver_id is NULL until an admin/professor actions the request.
    """
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(
        Integer, ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # one approval record per booking
    )
    approver_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(
        SAEnum(ApprovalStatus, native_enum=True, name="approvalstatus"),
        nullable=False,
        default=ApprovalStatus.PENDING,
    )
    notes_id = Column(
        Integer, ForeignKey("action_reasons.id", ondelete="SET NULL"),
        nullable=True,
    )
    requested_at = Column(DateTime, default=func.now(), nullable=False)
    actioned_at = Column(DateTime, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    booking = relationship("Booking", back_populates="approval")
    approver = relationship(
        "User",
        back_populates="approvals_given",
        foreign_keys=[approver_id],
    )
    notes = relationship("ActionReason", foreign_keys=[notes_id])

    def __repr__(self) -> str:
        return (
            f"<Approval id={self.id} booking_id={self.booking_id} "
            f"status={self.status}>"
        )


# ══════════════════════════════════════════════════════════════════════════════
# Model: SystemLog
# ══════════════════════════════════════════════════════════════════════════════

class SystemLog(Base):
    """
    Append-only audit log for all significant system events.

    user_id and booking_id are plain integers (no FK constraint) so that
    log rows survive user/booking deletion — preserving full audit history.

    log_metadata: arbitrary JSON context per event (Python attr name avoids
    shadowing SQLAlchemy's Base.metadata; DB column name remains 'metadata').
    """
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(
        SAEnum(LogLevel, native_enum=True, name="loglevel"),
        nullable=False,
    )
    action = Column(String(100), nullable=False)   # e.g. BOOKING_CREATED
    user_id = Column(Integer, nullable=True)       # plain int, no FK
    booking_id = Column(Integer, nullable=True)    # plain int, no FK
    message = Column(Text, nullable=False)
    log_metadata = Column(
        "metadata", JSON, nullable=True             # DB column = "metadata"
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<SystemLog id={self.id} level={self.level} action={self.action!r}>"
        )


class Notification(Base):
    """
    User-facing notification message.
    Stored for each user so the frontend can render personalized notification feeds.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    type = Column(String(100), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    booking_id = Column(Integer, nullable=True)
    read = Column(Boolean, default=False, nullable=False)
    log_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<Notification id={self.id} user_id={self.user_id} type={self.type!r} read={self.read}>"
        )


# ══════════════════════════════════════════════════════════════════════════════
# Model: ActionReason
# ══════════════════════════════════════════════════════════════════════════════

class ActionReason(Base):
    """
    Normalized dictionary of predefined reasons for cancellations or administrative blocks.
    """
    __tablename__ = "action_reasons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_label = Column(String(100), nullable=False, unique=True)
    reason_statement = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<ActionReason id={self.id} label={self.action_label} statement={self.reason_statement!r}>"
